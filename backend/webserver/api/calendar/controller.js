'use strict';

const request = require('request');
const urljoin = require('url-join');
const ICAL = require('@linagora/ical.js');
const jcalHelper = require('../../../lib/helpers/jcal');
const MAX_TRY_NUMBER = 12;

module.exports = dependencies => {
  const logger = dependencies('logger');
  const calendar = require('./core')(dependencies);
  const configHelpers = dependencies('helpers').config;
  const userModule = dependencies('user');
  const invitation = require('../../../lib/invitation')(dependencies);

  return {
    dispatchEvent,
    sendInvitation,
    changeParticipation,
    searchEventsBasic
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
    const {email, notify, method, event, calendarURI, eventPath} = req.body;

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

    if (!eventPath || typeof eventPath !== 'string') {
      return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'eventPath is required and must be a string'}});
    }

    const notificationPromise = notify ? invitation.email.send : () => Promise.resolve();

    notificationPromise(req.user, email, method, event, calendarURI, eventPath, req.domain)
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

  function changeParticipationSuccess(res, vcalendar, req) {
    const attendeeEmail = req.eventPayload.attendeeEmail;

    userModule.findByEmail(attendeeEmail, (err, found) => {
      if (err) {
        logger.error('Error while redirecting after participation change', err);
        redirectToStaticErrorPage(req, res, { code: 500 });
      } else if (!found) {
        configHelpers.getBaseUrl(null, (err, baseUrl) => {
          if (err) {
            logger.error('Error while rendering event consultation page', err);

            return redirectToStaticErrorPage(req, res, { code: 500 });
          }

          invitation.link.generateActionLinks(baseUrl, req.eventPayload).then(links => {
            res.status(200).render('../event-consultation-app/index', {
              eventJSON: vcalendar.toJSON(),
              attendeeEmail: attendeeEmail,
              links: links,
              locale: req.getLocale()
            });
          });
        });
      } else {
        res.status(200).redirect('/#/calendar');
      }
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

      attendees.forEach(attendee => {
        attendee.setParameter('partstat', action);
      });

      request({method: 'PUT', headers: {ESNToken: ESNToken, 'If-Match': response.headers.etag}, body: vcalendar.toJSON(), url: url, json: true}, (err, response) => {
        if (!err && response.statusCode === 412) {
          tryUpdateParticipation(url, ESNToken, res, req, numTry);
        } else if (err || response.statusCode < 200 || response.statusCode >= 300) {
          redirectToStaticErrorPage(req, res, { code: response && response.statusCode });
        } else {
          changeParticipationSuccess(res, vcalendar, req);
        }
      });
    });
  }

  function changeParticipation(req, res) {
    const ESNToken = req.token && req.token.token ? req.token.token : '';
    const url = urljoin(req.davserver, 'calendars', req.user._id, req.eventPayload.calendarURI, req.eventPayload.uid + '.ics');

    tryUpdateParticipation(url, ESNToken, res, req);
  }

  function searchEventsBasic(req, res) {
    const query = {
      search: req.query.query,
      limit: req.query.limit,
      offset: req.query.offset,
      sortKey: req.query.sortKey,
      sortOrder: req.query.sortOrder,
      userId: req.params.userId,
      calendarId: req.params.calendarId
    };

    calendar.searchEvents(query, (err, eventsData) => {
      if (err) {
        return res.status(500).json({error: {code: 500, message: 'Error while searching for events', details: err.message}});
      }

      const davItems = [];
      const json = {
        _links: {
          self: {
            href: req.originalUrl
          }
        },
        _total_hits: eventsData.total_count,
        _embedded: {
          'dav:item': davItems
        }
      };

      res.header('X-ESN-Items-Count', eventsData.total_count);

      eventsData.results.forEach(eventData => {
        davItems.push({
          _links: {
            self: {
              href: eventData.path
            }
          },
          data: eventData.event,
          etag: eventData.etag
        });
      });

      res.status(200).json(json);
    });
  }
};
