const request = require('request');
const urljoin = require('url-join');
const Q = require('q');
const _ = require('lodash');
const path = require('path');
const uuidV4 = require('uuid/v4');
const ICAL = require('@linagora/ical.js');
const { parseEventPath } = require('../helpers/event');

const JSON_CONTENT_TYPE = 'application/json';
const DEFAULT_CALENDAR_NAME = 'Events';

module.exports = dependencies => {
  const logger = dependencies('logger');
  const davserver = dependencies('davserver').utils;
  const token = dependencies('auth').token;
  const technicalUserHelper = require('../helpers/technical-user')(dependencies);

  return {
    buildEventUrlFromEventPath,
    createCalendarAsTechnicalUser,
    updateCalendarAsTechnicalUser,
    deleteCalendarsAsTechnicalUser,
    getCalendarAsTechnicalUser,
    getAllCalendarsInDomainAsTechnicalUser,
    getAllEventsInCalendarAsTechnicalUser,
    getCalendarList,
    getEvent,
    getMultipleEventsFromPaths,
    getEventFromUrl,
    updateEvent,
    getEventInDefaultCalendar,
    getEventPath,
    storeEvent,
    storeEventInDefaultCalendar,
    deleteEvent,
    deleteEventInDefaultCalendar,
    iTipRequest,
    createEventInDefaultCalendar,
    importEvent
  };

  function buildEventUrlFromEventPath(eventPath) {
    return new Promise(resolve => davserver.getDavEndpoint(davserver => resolve(urljoin(davserver, eventPath))));
  }

  function createCalendarAsTechnicalUser(options, payload) {
    const { userId, domainId } = options;
    const requestOptions = {
      userId,
      getNewTokenFn: technicalUserHelper.getTechnicalUserToken(domainId)
    };

    return _requestCaldav(requestOptions, (url, token) => ({
      method: 'POST',
      headers: { ESNToken: token },
      url,
      body: payload,
      json: true
    }),
    response => response);
  }

  function updateCalendarAsTechnicalUser(options, payload) {
    const { userId, calendarUri, domainId } = options;
    const requestOptions = {
      userId,
      calendarUri,
      getNewTokenFn: technicalUserHelper.getTechnicalUserToken(domainId)
    };

    return _requestCaldav(requestOptions, (url, token) => ({
      method: 'PROPPATCH',
      headers: { ESNToken: token },
      url,
      body: payload,
      json: true
    }),
    response => response);
  }

  function deleteCalendarsAsTechnicalUser(options) {
    const { userId, domainId } = options;
    const requestOptions = {
      userId,
      getNewTokenFn: technicalUserHelper.getTechnicalUserToken(domainId)
    };

    return _requestCaldav(requestOptions, (url, token) => ({
      method: 'DELETE',
      headers: { ESNToken: token, accept: 'application/json' },
      url
    }),
    response => response);
  }

  function getCalendarAsTechnicalUser(options) {
    const { userId, calendarUri, domainId } = options;
    const requestOptions = {
      userId,
      calendarUri,
      getNewTokenFn: technicalUserHelper.getTechnicalUserToken(domainId)
    };

    return _requestCaldav(requestOptions, (url, token) => ({
      method: 'GET',
      url: url,
      json: true,
      headers: {
        ESNToken: token,
        Accept: JSON_CONTENT_TYPE
      }
    }))
      .then(calendar => {
        const uri = calendar._links.self.href.replace('.json', '');

        return {
          id: path.basename(uri),
          uri: uri,
          name: calendar['dav:name'] || DEFAULT_CALENDAR_NAME,
          description: calendar['caldav:description'],
          color: calendar['apple:color']
        };
      });
  }

  /**
   * Request to Sabre to get all events in a calendar as a technical user.
   *
   * @param {Object} options The request options
   * @param {String} options.calendarUri The uri of the calendar in which the events are fetched
   * @param {String} options.domainId The id of the domain to get the technical user from
   * @param {String} options.calendarHomeId The id of the calendar home (the user that owns the calendar)
   * @param {Boolean} options.shouldStripCancelledEvents Whether to strip out CANCELLED events or not (default: true)
   * @return {Promise<[Object]>} An array of event objects with iCal formatted info
   */
  function getAllEventsInCalendarAsTechnicalUser(options) {
    const { calendarUri, domainId, calendarHomeId, shouldStripCancelledEvents } = { shouldStripCancelledEvents: true, ...options };
    const requestOptions = {
      userId: calendarHomeId,
      calendarUri,
      getNewTokenFn: technicalUserHelper.getTechnicalUserToken(domainId)
    };

    return _requestCaldav(requestOptions, (url, token) => ({
      method: 'GET',
      url: `${url}?allEvents=true`,
      json: true,
      headers: {
        ESNToken: token,
        Accept: JSON_CONTENT_TYPE
      }
    }))
      .then(responseBody => responseBody._embedded['dav:item'].map(item => {
        const { userId, calendarId, eventUid } = parseEventPath(item._links.self.href);
        const vcalendar = ICAL.Component.fromString(item.data);
        const vevents = vcalendar.getAllSubcomponents('vevent');

        return vevents.map(vevent => {
          if (shouldStripCancelledEvents && vevent.getFirstPropertyValue('status') === 'CANCELLED') return;

          const eventData = { ics: item.data, userId, calendarId, eventUid };
          const recurrenceId = vevent.getFirstPropertyValue('recurrence-id');

          if (recurrenceId) {
            eventData.recurrenceId = recurrenceId.toString();
          }

          return eventData;
        });
      }))
      .then(events => _.flatten(events).filter(Boolean));
  }

  function getAllCalendarsInDomainAsTechnicalUser(domainId) {
    const requestOptions = {
      getNewTokenFn: technicalUserHelper.getTechnicalUserToken(domainId),
      isRootPath: true
    };

    return _requestCaldav(requestOptions, (url, token) => ({
      method: 'GET',
      url,
      json: true,
      headers: {
        ESNToken: token,
        Accept: JSON_CONTENT_TYPE
      }
    })).then(data => {
      const calendars = [];

      Object.keys(data).forEach(calendarHomeId => {
        data[calendarHomeId].forEach(calendarUri => {
          calendars.push({
            domainId,
            calendarHomeId,
            calendarUri
          });
        });
      });

      return calendars;
    });
  }

  function createEventInDefaultCalendar(user, options) {
    const eventUid = uuidV4(),
      event = _buildJCalEvent(eventUid, options);

    return storeEventInDefaultCalendar(user, eventUid, event);
  }

  function storeEventInDefaultCalendar(user, eventUid, event) {
    return storeEvent(user, user.id, eventUid, event);
  }

  function storeEvent(user, calendarUri, eventUid, event) {
    return _requestCaldav({ userId: user.id, calendarUri, eventUid }, (url, token) => ({
      method: 'PUT',
      url,
      json: true,
      headers: {
        ESNToken: token
      },
      body: event
    }));
  }

  function deleteEventInDefaultCalendar(user, eventUid) {
    return deleteEvent(user, user.id, eventUid);
  }

  function deleteEvent(user, calendarUri, eventUid) {
    return _requestCaldav({ userId: user.id, calendarUri, eventUid }, (url, token) => ({
      method: 'DELETE',
      url,
      headers: {
        ESNToken: token
      }
    }));
  }

  function getCalendarList(userId, urlParams = null) {
    return _requestCaldav({ userId, urlParams}, (url, token) => ({
      method: 'GET',
      url: url,
      json: true,
      headers: {
        ESNToken: token,
        Accept: JSON_CONTENT_TYPE
      }
    })).then(res => {
      if (res && res._embedded && res._embedded['dav:calendar']) {
        return _.map(res._embedded['dav:calendar'], calendar => {
          const uri = calendar._links.self.href.replace('.json', ''); // No JSON for *DAV URI

          return {
            id: path.basename(uri),
            uri: uri,
            name: calendar['dav:name'] || DEFAULT_CALENDAR_NAME,
            description: calendar['caldav:description'],
            color: calendar['apple:color']
          };
        });
      }

      return [];
    });
  }

  function getEventInDefaultCalendar(user, eventUid) {
    return getEvent(user.id, user.id, eventUid).then(response => response.ical);
  }

  function getEvent(userId, calendarUri, eventUid) {
    return _requestCaldav({ userId, calendarUri, eventUid }, (url, token) => ({
        method: 'GET',
        url: url,
        headers: {
          ESNToken: token
        }
      }),
      response => ({ ical: response.body, etag: response.headers.etag })
    );
  }

  function getEventPath(userId, calendarUri, eventUid) {
    const eventPath = calendarUri && eventUid ? urljoin(userId, calendarUri, eventUid + '.ics') : userId;

    return urljoin('/calendars', eventPath);
  }

  function iTipRequest(userId, jcal) {
    return _requestCaldav({ userId }, (url, token) => ({
      method: 'ITIP',
      url: url,
      headers: {
        ESNToken: token
      },
      body: jcal,
      json: true
    }));
  }

  function getMultipleEventsFromPaths(userId, paths = []) {
    if (!paths.length) {
      return Promise.resolve([]);
    }

    return _requestCaldav({ userId, isRootPath: true }, (url, token) => ({
      method: 'REPORT',
      url,
      headers: {
        ESNToken: token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        eventPaths: paths
      })
    }))
      .then(response => JSON.parse(response)._embedded['dav:item'].map(item => {
        if (item.status !== 200) {
          return logger.error('Cannot fetch the event', item._links.self.href, item.status);
        }

        return {
          etag: item.etag,
          ical: (new ICAL.Component(item.data)).toString(),
          path: item._links.self.href
        };
      }).filter(Boolean));
  }

  function _requestCaldav(options, formatRequest, formatResult) {
    const { userId, calendarUri, eventUid, getNewTokenFn, urlParams, isRootPath } = options;
    const getNewToken = getNewTokenFn || Q.nfcall(token.getNewToken, { user: userId });

    return Q.all([
      _buildEventUrl({ isRootPath, userId, calendarUri, eventUid, urlParams }),
      getNewToken
    ])
      .spread((eventUrl, newToken) => Q.nfcall(request, formatRequest(eventUrl, newToken.token)))
      .spread(response => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          logger.error('Error when requesting to DAV server', JSON.stringify(response.body));

          return Q.reject(new Error(`Invalid response status from DAV server ${response.statusCode}`));
        }

        return formatResult ? formatResult(response) : response.body;
      });
  }

  function _buildEventUrl({ isRootPath, userId, calendarUri, eventUid, urlParams }) {
    let path = '/calendars';

    if (!isRootPath) {
      path = !eventUid && calendarUri ? `/calendars/${userId}/${calendarUri}.json` : getEventPath(userId, calendarUri, eventUid);

      path = urlParams ? path + `?${urlParams}` : path;
    }

    return new Promise(resolve => davserver.getDavEndpoint(davserver => resolve(urljoin(davserver, path))));
  }

  function _buildJCalEvent(uid, options) {
    const vCalendar = new ICAL.Component(['vcalendar', [], []]),
      vEvent = new ICAL.Component('vevent'),
      event = new ICAL.Event(vEvent);

    event.uid = uid;
    event.summary = options.summary;
    event.location = options.location;
    event.startDate = ICAL.Time.fromJSDate(options.start.toDate(), true);
    event.endDate = ICAL.Time.fromJSDate(options.start.add(1, 'hour').toDate(), true);

    vCalendar.addSubcomponent(vEvent);

    return vCalendar;
  }

  function getEventFromUrl({ url, ESNToken }) {
    return new Promise((resolve, reject) => {
      request({ method: 'GET', url, headers: { ESNToken }}, (err, response) => {
        if (err || response.statusCode < 200 || response.statusCode >= 300) {
          return reject(err || new Error(`Invalid response status from DAV server ${response.statusCode}`));
        }

        return resolve({ ical: response.body, etag: response.headers.etag });
      });
    });
  }

  function updateEvent({ url, json, etag, ESNToken }) {
    return new Promise((resolve, reject) => {
      request({method: 'PUT', headers: { ESNToken, 'If-Match': etag }, body: json, url, json: true}, (err, response) => {
        if (err || response.statusCode < 200 || response.statusCode >= 300) {
          err ? logger.error('Error while sending the event to the server', err) : logger.error(`Bad response code from the server ${response.statusCode}`);

          return reject(new Error('Can not update the event'));
        }

        resolve();
      });
    });
  }

  function importEvent(user, calendarUri, eventUid, event) {
    return _requestCaldav({ userId: user.id, calendarUri, eventUid, urlParams: 'import' }, (url, token) => ({
      method: 'PUT',
      url,
      json: true,
      headers: {
        ESNToken: token
      },
      body: event
    }));
  }
};
