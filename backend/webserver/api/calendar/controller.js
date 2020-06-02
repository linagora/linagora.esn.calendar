const request = require('request');
const urljoin = require('url-join');
const ICAL = require('@linagora/ical.js');
const jcalHelper = require('../../../lib/helpers/jcal');
const { promisify } = require('util');
const MAX_TRY_NUMBER = 12;

module.exports = dependencies => {
  const logger = dependencies('logger');
  const calendar = require('./core')(dependencies);
  const configHelpers = dependencies('helpers').config;
  const userModule = dependencies('user');
  const invitation = require('../../../lib/invitation')(dependencies);

  const findUserByEmail = promisify(userModule.findByEmail);
  const getBaseUrl = promisify(configHelpers.getBaseUrl);

  return {
    dispatchEvent,
    sendInvitation,
    changeParticipation
  };

  function dispatchEvent(req, res) {
    if (!req.user) {
      return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'You must be logged in to access this resource'}});
    }

    if (!req.collaboration) {
      return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'Collaboration id is missing'}});
    }

    if (!req.body.event_id) {
      return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'Event id is missing'}});
    }

    calendar.dispatch({
      user: req.user,
      collaboration: req.collaboration,
      event: req.body
    }, (err, result) => {
      if (err) {
        logger.error('Event creation error', err);

        return res.status(500).json({ error: { code: 500, message: 'Event creation error', details: err.message }});
      } else if (!result) {
        return res.status(403).json({ error: { code: 403, message: 'Forbidden', details: 'You may not create the calendar event' }});
      }

      res.status(req.body.type === 'created' ? 201 : 200).json({ _id: result._id, objectType: result.objectType });
    });
  }

  function sendInvitation(req, res) {
    const {email, notify, method, event, calendarURI, newEvent} = req.body;

    if (!email) {
      return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'The "emails" array is required and must contain at least one element'}});
    }

    if (!method || typeof method !== 'string') {
      return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'Method is required and must be a string (REQUEST, REPLY, CANCEL, etc.)'}});
    }

    if (!event || typeof event !== 'string') {
      return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'Event is required and must be a string (ICS format)'}});
    }

    if (!calendarURI || typeof calendarURI !== 'string') {
      return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'Calendar Id is required and must be a string'}});
    }

    const notificationPromise = notify ? invitation.email.send : () => Promise.resolve();

    notificationPromise({
      sender: req.user,
      recipientEmail: email,
      method,
      ics: event,
      calendarURI,
      domain: req.domain,
      newEvent
    })
      .then(() => res.status(200).end())
      .catch(err => {
        logger.error('Error when trying to send invitations to attendees', err);

        res.status(500).json({error: {code: 500, message: 'Error when trying to send invitations to attendees', details: err.message}});
      });
  }

  function redirectToStaticErrorPage(req, res, error) {
    res.status(200).render('../event-consultation-app/error', {
      error,
      locale: req.getLocale()
    });
  }

  function changeParticipationSuccess({req, res, vcalendar, modified}) {
    const { attendeeEmail, organizerEmail } = req.eventPayload;

    findUserByEmail(attendeeEmail)
      .then(foundUser => {
        if (foundUser) {
          res.status(200).redirect('/#/calendar');

          return modified && invitation.email.send({
            sender: foundUser,
            recipientEmail: organizerEmail,
            method: 'REPLY',
            ics: vcalendar.toString(),
            calendarURI: req.eventPayload.calendarURI,
            domain: req.domain
          });
        }

        return getBaseUrl(null)
          .then(baseUrl => invitation.link.generateActionLinks(baseUrl, req.eventPayload))
          .then(links => {
            res.status(200).render('../event-consultation-app/index', {
              eventJSON: vcalendar.toJSON(),
              attendeeEmail,
              links,
              locale: req.getLocale()
            });

            return modified && invitation.email.replyFromExternalUser({
              editorEmail: attendeeEmail,
              recipientEmail: organizerEmail,
              ics: vcalendar.toString(),
              calendarURI: req.eventPayload.calendarURI,
              domain: req.domain
            });
          });
      })
      .catch(error => {
        logger.error('Error while post-processing participation change', error);

        redirectToStaticErrorPage(req, res, { code: 500 });
      });
  }

  function tryUpdateParticipation(url, ESNToken, res, req, numTry) {
    numTry = numTry ? numTry + 1 : 1;
    if (numTry > MAX_TRY_NUMBER) {
      logger.error('Exceeded max number of try for atomic update of event');

      return redirectToStaticErrorPage(req, res, { code: 500 });
    }

    request({method: 'GET', url: url, headers: {ESNToken: ESNToken}}, (err, response) => {
      if (err || response.statusCode < 200 || response.statusCode >= 300) {
        return redirectToStaticErrorPage(req, res, { code: response && response.statusCode });
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

        return redirectToStaticErrorPage(req, res, { code: 400 });
      }

      if (attendees.every(attendee => attendee.getParameter('partstat') === action)) {
        return changeParticipationSuccess({ req, res, vcalendar, modified: false });
      }

      attendees.forEach(attendee => {
        attendee.setParameter('partstat', action);
      });

      request({method: 'PUT', headers: {ESNToken: ESNToken, 'If-Match': response.headers.etag}, body: vcalendar.toJSON(), url: url, json: true}, (err, response) => {
        if (!err && response.statusCode === 412) {
          tryUpdateParticipation(url, ESNToken, res, req, numTry);
        } else if (err || response.statusCode < 200 || response.statusCode >= 300) {
          redirectToStaticErrorPage(req, res, { code: response && response.statusCode });
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
};
