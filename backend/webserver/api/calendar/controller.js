const request = require('request');
const urljoin = require('url-join');
const ICAL = require('@linagora/ical.js');
const jcalHelper = require('../../../lib/helpers/jcal');
const { promisify } = require('util');
const MAX_TRY_NUMBER = 12;
const extend = require('extend');

module.exports = dependencies => {
  const logger = dependencies('logger');
  const esnConfig = dependencies('esn-config');
  const calendar = require('./core')(dependencies);
  const configHelpers = dependencies('helpers').config;
  const userModule = dependencies('user');
  const invitation = require('../../../lib/invitation')(dependencies);
  const auth = dependencies('auth');

  const findUserByEmail = promisify(userModule.findByEmail);
  const findUserById = promisify(userModule.get);
  const getBaseUrl = promisify(configHelpers.getBaseUrl);

  return {
    dispatchEvent,
    changeParticipation,
    downloadIcsFile,
    generateJWTforSecretLink
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
    const url = urljoin(req.davserver, 'calendars', req.linkPayload.calendarHomeId, req.linkPayload.calendarId + '?export');

    findUserById(req.user._id)
      .then(user => {
        const secretLinkTokenEsnConfig = esnConfig('secretLinkToken').inModule('linagora.esn.calendar').forUser(user);

        return secretLinkTokenEsnConfig.get('secretLinkSettings');
      })
      .then(secretLinks => {
        const secretLinkSettingForCalendar = secretLinks.find(({ calendarId }) => calendarId === req.linkPayload.calendarId);

        if (secretLinkSettingForCalendar && secretLinkSettingForCalendar.token !== req.query.jwt) {
          return res.status(403).json({
            error: {
              code: 403,
              message: 'Unauthorized',
              details: 'Unauthorized'
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

          res.setHeader('Content-Disposition', 'attachment;filename=MyCalendar.ics');
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

  function generateJWTforSecretLink(req, res) {
    const payload = {};
    const jwtPayload = req.body;

    extend(true, payload, jwtPayload);

    auth.jwt.generateWebToken(payload, (err, token) => {
      if (err) {
        logger.error('Error when trying to generate a token for the secret link', err);

        return res.status(500).json({ error: { code: 500, message: 'Error when trying to generate a token for the secret link', details: err.message } });
      }

      // save the token in the esnConfig
      const secretLinkTokenEsnConfig = esnConfig('secretLinkToken').inModule('linagora.esn.calendar').forUser(req.user);

      secretLinkTokenEsnConfig.set('secretLinkSettings', [{
        calendarId: payload.calendarId,
        token
      }])
        .then(() => {
          res.status(200).json({ token });
        })
        .catch(err => {
          logger.error('Can not generate a token for the secret link due to an unexpected error', err);

          res.status(500).json({
            error: {
              code: 500,
              message: 'Can not generate token',
              details: err.message || 'Can not generate token'
            }
          });
        });
    });
  }
};
