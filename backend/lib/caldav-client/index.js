'use strict';

const request = require('request');
const urljoin = require('url-join');
const Q = require('q');
const _ = require('lodash');
const path = require('path');
const uuidV4 = require('uuid/v4');
const ICAL = require('ical.js');

const JSON_CONTENT_TYPE = 'application/json';
const DEFAULT_CALENDAR_NAME = 'Events';
const DEFAULT_CALENDAR_URI = 'events';
const RESOURCE_COLOR = '#F44336';

module.exports = dependencies => {
  const logger = dependencies('logger');
  const davserver = dependencies('davserver').utils;
  const token = dependencies('auth').token;
  const technicalUserHelper = require('../helpers/technical-user')(dependencies);

  return {
    createResourceCalendar,
    deleteResourceCalendars,
    getCalendarList,
    getEvent,
    getEventFromUrl,
    updateEvent,
    getEventInDefaultCalendar,
    getEventPath,
    storeEvent,
    storeEventInDefaultCalendar,
    deleteEvent,
    deleteEventInDefaultCalendar,
    iTipRequest,
    createEventInDefaultCalendar
  };

  function createResourceCalendar(resource) {
    const options = {
      userId: resource._id,
      getNewTokenFn: technicalUserHelper.getTechnicalUserToken(resource.domain)
    };

    return _requestCaldav(options, (url, token) => ({
      method: 'POST',
      headers: { ESNToken: token.token },
      url,
      body: _generatePayload(resource),
      json: true
    }),
    response => response);
  }

  function deleteResourceCalendars(resource) {
    return _requestCaldav({ userId: resource._id }, (url, token) => ({
      method: 'DELETE',
      headers: { ESNToken: token.token, accept: 'application/json' },
      url
    }),
    response => response);
  }

  function _generatePayload(resource) {
    return {
      id: resource._id,
      'dav:name': resource.name,
      'apple:color': RESOURCE_COLOR,
      'caldav:description': resource.description
    };
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

  function getCalendarList(userId) {
    return _requestCaldav({ userId }, (url, token) => ({
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

  function _requestCaldav(options, formatRequest, formatResult) {
    const { userId, calendarUri, eventUid, getNewTokenFn } = options;
    const getNewToken = getNewTokenFn || Q.nfcall(token.getNewToken, { user: userId });

    return Q.all([
      _buildEventUrl(userId, calendarUri, eventUid),
      getNewToken
    ])
      .spread((eventUrl, newToken) =>
        Q.nfcall(request, formatRequest(eventUrl, newToken.token))
      )
      .spread(response => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return Q.reject(response.body);
        }

        return formatResult ? formatResult(response) : response.body;
      });
  }

  function _buildEventUrl(userId, calendarUri, eventUid) {
    return new Promise(resolve => davserver.getDavEndpoint(davserver => resolve(urljoin(davserver, getEventPath(userId, calendarUri, eventUid)))));

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
          err && logger.error('Error while sending the event to the server', err);

          return reject(new Error('Can not update the event'));
        }

        resolve();
      });
    });
  }
};
