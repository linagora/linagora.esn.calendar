const request = require('request');
const urljoin = require('url-join');
const shortUUID = require('short-uuid');
const ICAL = require('@linagora/ical.js');
const jcalHelper = require('../../../lib/helpers/jcal');
const { promisify } = require('util');
const MAX_TRY_NUMBER = 12;

module.exports = dependencies => {
  const logger = dependencies('logger');
  const esnConfig = dependencies('esn-config');
  const calendar = require('./core')(dependencies);
  const configHelpers = dependencies('helpers').config;
  const userModule = dependencies('user');
  const invitation = require('../../../lib/invitation')(dependencies);

  const findUserByEmail = promisify(userModule.findByEmail);
  const getBaseUrl = promisify(configHelpers.getBaseUrl);

  return {
    dispatchEvent,
    changeParticipation,
    downloadIcsFile,
    getSecretLink
  };

  function dispatchEvent(req, res) {
    if (!req.user) {
      return res.status(400).json({ error: { code: 400, message: 'Bad Request', details: 'You must be logged in to access this resource' } });
    }

    if (!req.collaboration) {
      return res.status(400).json({ error: { code: 400, message: 'Bad Request', details: 'Collaboration id is missing' } });
    }

    if (!req.body.event_id) {
      return res.status(400).json({ error: { code: 400, message: 'Bad Request', details: 'Event id is missing' } });
    }

    calendar.dispatch({
      user: req.user,
      collaboration: req.collaboration,
      event: req.body
    }, (err, result) => {
      if (err) {
        logger.error('Event creation error', err);

        return res.status(500).json({ error: { code: 500, message: 'Event creation error', details: err.message } });
      } else if (!result) {
        return res.status(403).json({ error: { code: 403, message: 'Forbidden', details: 'You may not create the calendar event' } });
      }

      res.status(req.body.type === 'created' ? 201 : 200).json({ _id: result._id, objectType: result.objectType });
    });
  }

  function changeParticipationSuccess({ req, res, vcalendar, modified }) {
    const { attendeeEmail, organizerEmail } = req.eventPayload;

    findUserByEmail(attendeeEmail)
      .then(foundUser => {
        if (foundUser) {
          modified && invitation.email.sendNotificationEmails({
            sender: foundUser,
            recipientEmail: organizerEmail,
            method: 'REPLY',
            ics: vcalendar.toString(),
            calendarURI: req.eventPayload.calendarURI,
            domain: req.domain
          });

          return res.status(200).json({
            redirect: true,
            locale: req.getLocale()
          });
        }

        return getBaseUrl(null)
          .then(baseUrl => invitation.link.generateActionLinks(baseUrl, req.eventPayload))
          .then(links => {
            modified && invitation.email.replyFromExternalUser({
              editorEmail: attendeeEmail,
              recipientEmail: organizerEmail,
              ics: vcalendar.toString(),
              calendarURI: req.eventPayload.calendarURI,
              domain: req.domain
            });

            return res.status(200).json({
              eventJSON: vcalendar.toJSON(),
              attendeeEmail,
              links,
              locale: req.getLocale()
            });
          });
      })
      .catch(err => {
        logger.error('Error while post-processing participation change', err);

        return res.status(500).json({
          error: {
            code: 500,
            message: 'Can not update participation',
            details: err.message || 'Error while post-processing participation change'
          },
          locale: req.getLocale()
        });
      });
  }

  function tryUpdateParticipation(url, ESNToken, res, req, numTry) {
    numTry = numTry ? numTry + 1 : 1;
    if (numTry > MAX_TRY_NUMBER) {
      logger.error('Exceeded max number of try for atomic update of event');

      return res.status(500).json({
        error: {
          code: 500,
          message: 'Can not update participation',
          details: 'Exceeded max number of try for atomic update of event'
        },
        locale: req.getLocale()
      });
    }

    request({ method: 'GET', url: url, headers: { ESNToken: ESNToken } }, (err, response) => {
      if (err || response.statusCode < 200 || response.statusCode >= 300) {
        const statusCode = response && response.statusCode || 500;

        logger.error(`Can not update participation due to an error while sending a GET request to fetch the event's data. statusCode = ${statusCode}. Error:`, err);

        return res.status(statusCode).json({
          error: {
            code: statusCode,
            message: 'Can not update participation',
            details: 'Can not update participation'
          },
          locale: req.getLocale()
        });
      }

      const icalendar = new ICAL.parse(response.body);
      const vcalendar = new ICAL.Component(icalendar);
      const vevent = vcalendar.getFirstSubcomponent('vevent');
      const attendeeEmail = req.eventPayload.attendeeEmail;
      const action = req.eventPayload.action;
      const events = [vevent].concat(vcalendar.getAllSubcomponents('vevent').filter(vevent => vevent.getFirstPropertyValue('recurrence-id')));
      const attendees = events.map(vevent => jcalHelper.getVeventAttendeeByMail(vevent, attendeeEmail)).filter(Boolean);

      if (!attendees.length) {
        logger.error(`Can not find the attendee ${attendeeEmail} in the event`);

        return res.status(400).json({
          error: {
            code: 400,
            message: 'Can not update participation',
            details: `Can not find the attendee ${attendeeEmail} in the event`
          },
          locale: req.getLocale()
        });
      }

      if (attendees.every(attendee => attendee.getParameter('partstat') === action)) {
        return changeParticipationSuccess({ req, res, vcalendar, modified: false });
      }

      attendees.forEach(attendee => {
        attendee.setParameter('partstat', action);
      });

      request({ method: 'PUT', headers: { ESNToken: ESNToken, 'If-Match': response.headers.etag }, body: vcalendar.toJSON(), url: url, json: true }, (err, response) => {
        if (!err && response.statusCode === 412) {
          tryUpdateParticipation(url, ESNToken, res, req, numTry);
        } else if (err || response.statusCode < 200 || response.statusCode >= 300) {
          const statusCode = response && response.statusCode || 500;

          logger.error(`An error occurred while sending a PUT request to update participation. statusCode = ${statusCode}. Error:`, err);

          return res.status(statusCode).json({
            error: {
              code: statusCode,
              message: 'Can not update participation',
              details: 'Can not update participation'
            },
            locale: req.getLocale()
          });
        } else {
          changeParticipationSuccess({ req, res, vcalendar, modified: true });
        }
      });
    });
  }

  function changeParticipation(req, res) {
    const ESNToken = req.token && req.token.token ? req.token.token : '';
    const url = urljoin(req.davserver, 'calendars', req.user._id, req.eventPayload.calendarURI, req.eventPayload.uid + '.ics');

    tryUpdateParticipation(url, ESNToken, res, req);
  }

  function downloadIcsFile(req, res) {
    const ESNToken = req.token && req.token.token ? req.token.token : '';
    const url = urljoin(req.davserver, 'calendars', req.params.calendarHomeId, req.params.calendarId + '?export');

    const secretLinkTokenEsnConfig = esnConfig('secretLinkToken').inModule('linagora.esn.calendar').forUser(req.user);

    secretLinkTokenEsnConfig.get('secretLinkSettings')
      .then(secretLinks => {
        const secretLinkSettingForCalendar = secretLinks.find(({ calendarId }) => calendarId === req.params.calendarId);

        if (!secretLinkSettingForCalendar || secretLinkSettingForCalendar.token !== req.query.token) {
          return res.status(403).json({
            error: {
              code: 403,
              message: 'Forbidden',
              details: 'Forbidden'
            }
          });
        }

        request({ method: 'GET', url, headers: { ESNToken } }, (err, response) => {
          if (err || response.statusCode < 200 || response.statusCode >= 300) {
            const statusCode = response && response.statusCode || 500;

            logger.error(`Can not download ics file due to an error while requesting to Sabre: GET ${url} with ESNToken = '${ESNToken}'. Status code: ${statusCode}`, err);

            return res.status(statusCode).json({
              error: {
                code: statusCode,
                message: 'Can not download the ics file',
                details: 'Can not download the ics file'
              }
            });
          }

          const icsFile = response.body;

          res.setHeader('Content-Disposition', 'attachment;filename=calendar.ics');
          res.setHeader('Content-type', 'text/calendar');

          return res.status(200).send(icsFile);
        });
      })
      .catch(err => {
        logger.error('Can not download ics file due to an unexpected error', err);

        res.status(500).json({
          error: {
            code: 500,
            message: 'Can not download the ics file due to an unexpected error',
            details: err.message || 'Can not download the ics file due to an unexpected error'
          }
        });
      });
  }

  function getSecretLink(req, res) {
    const { shouldResetLink } = req.query;
    const secretLinkTokenEsnConfig = esnConfig('secretLinkToken').inModule('linagora.esn.calendar').forUser(req.user, true);

    if (shouldResetLink === 'true') {
      return _getNewSecretLink();
    }

    return secretLinkTokenEsnConfig.get('secretLinkSettings')
      .then(secretLinkSettings => {
        const secretLinkSettingForCalendar = secretLinkSettings.find(({ calendarId }) => calendarId === req.params.calendarId);

        if (secretLinkSettingForCalendar && secretLinkSettingForCalendar.token) {
          return getBaseUrl(null)
            .then(baseUrl => {
              const secretLink = `${baseUrl}/calendar/api/calendars/${req.params.calendarHomeId}/${req.params.calendarId}/calendar.ics?token=${secretLinkSettingForCalendar.token}`;

              return res.status(200).json({ secretLink });
            });
        }

        return _getNewSecretLink();
      })
      .catch(err => {
        logger.error('Can not get the secret link due to an unexpected error', err);

        res.status(500).json({
          error: {
            code: 500,
            message: 'Can not get the secret link',
            details: err.message || 'Can not get secret link'
          }
        });
      });

    function _getNewSecretLink() {
      const token = shortUUID.generate();

      return secretLinkTokenEsnConfig.get('secretLinkSettings')
        .then(secretLinkSettings => {
          const newSecretLinkSettings = [...secretLinkSettings.filter(({ calendarId }) => calendarId !== req.params.calendarId), { calendarId: req.params.calendarId, token }];

          return secretLinkTokenEsnConfig.set('secretLinkSettings', newSecretLinkSettings);
        })
        .then(() => getBaseUrl(null))
        .then(baseUrl => {
          const secretLink = `${baseUrl}/calendar/api/calendars/${req.params.calendarHomeId}/${req.params.calendarId}/calendar.ics?token=${token}`;

          res.status(200).json({ secretLink });
        })
        .catch(err => {
          logger.error('Can not get the secret link due to an unexpected error', err);

          res.status(500).json({
            error: {
              code: 500,
              message: 'Can not get the secret link',
              details: err.message || 'Can not get secret link'
            }
          });
        });
    }
  }
};
