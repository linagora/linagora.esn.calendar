'use strict';

const request = require('request');
const urljoin = require('url-join');
const Q = require('q');
const _ = require('lodash');
const path = require('path');
const uuidV4 = require('uuid/v4');
const ICAL = require('@linagora/ical.js');
const { parseString } = require('xml2js');

const JSON_CONTENT_TYPE = 'application/json';
const DEFAULT_CALENDAR_NAME = 'Events';
const DEFAULT_CALENDAR_URI = 'events';

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

  function createEventInDefaultCalendar(user, options) {
    const eventUid = uuidV4(),
      event = _buildJCalEvent(eventUid, options);

    return storeEventInDefaultCalendar(user, eventUid, event);
  }

  function storeEventInDefaultCalendar(user, eventUid, event) {
    return storeEvent(user, DEFAULT_CALENDAR_URI, eventUid, event);
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
    return deleteEvent(user, DEFAULT_CALENDAR_URI, eventUid);
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
    return getEvent(user.id, DEFAULT_CALENDAR_URI, eventUid).then(response => response.ical);
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

    let hrefs = '';

    paths.forEach(path => {
      hrefs += `<D:href>${path}</D:href>`;
    });

    return _requestCaldav({ userId, isRootPath: true }, (url, token) => ({
      method: 'REPORT',
      url,
      headers: {
        ESNToken: token,
        'Content-Type': 'application/xml',
        Accept: 'application/xml'
      },
      body: `<?xml version="1.0" encoding="utf-8" ?>
            <C:calendar-multiget xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
              <D:prop>
                <D:getetag/>
                <C:calendar-data/>
              </D:prop>
              ${hrefs}
            </C:calendar-multiget>`
    }))
    .then(data => Q.nfcall(parseString, data))
    .then(parsedData => parsedData['d:multistatus']['d:response'].map(item => {
      const propstat = item['d:propstat'][0];
      const path = item['d:href'][0];

      if (propstat['d:status'][0] !== 'HTTP/1.1 200 OK') {
        return logger.error('Cannot fetch the event', path, propstat['d:status'][0]);
      }

      return {
        etag: propstat['d:prop'][0]['d:getetag'][0],
        ical: propstat['d:prop'][0]['cal:calendar-data'][0],
        path
      };
    }).filter(Boolean));
  }

  function _requestCaldav(options, formatRequest, formatResult) {
    const { userId, calendarUri, eventUid, getNewTokenFn, urlParams, isRootPath} = options;
    const getNewToken = getNewTokenFn || Q.nfcall(token.getNewToken, { user: userId });

    return Q.all([
      _buildEventUrl({ isRootPath, userId, calendarUri, eventUid, urlParams }),
      getNewToken
    ])
      .spread((eventUrl, newToken) => Q.nfcall(request, formatRequest(eventUrl, newToken.token)))
      .spread(response => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
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
