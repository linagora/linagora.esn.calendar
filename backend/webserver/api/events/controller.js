'use strict';

const moment = require('moment');

module.exports = function(dependencies) {
  const i18n = dependencies('i18n'),
        search = require('../../../lib/search')(dependencies),
        calDavClient = require('../../../lib/caldav-client')(dependencies);

  return {
    getNextEvent,
    newEventInDefaultCalendar,
    cancelNextEvent
  };

  /////

  function getNextEvent(req, res) {
    search.searchNextEvent(req.user, _ensureNoSearchErrorAndOneResult(res, event => {
      if (req.accepts('json')) {
        return res.status(200).json(event);
      }

      res.status(200).send(_buildEventString(event, req.getLocale())); // Defaults to a human readable, text String
    }));
  }

  function cancelNextEvent(req, res) {
    search.searchNextEvent(req.user, _ensureNoSearchErrorAndOneResult(res, event => _calAction(calDavClient.deleteEventInDefaultCalendar(req.user, event.uid), res)));
  }

  function newEventInDefaultCalendar(req, res) {
    const { summary, location } = req.body,
          locale = req.getLocale(),
          start = require(`./locales/${locale}`)(dependencies)(req.body.when, locale);

    _calAction(calDavClient.createEventInDefaultCalendar(req.user, { summary, location, start }), res);
  }

  function _ensureNoSearchError(res, callback) {
    return (err, results) => {
      if (err) {
        return res.status(500).json({ error: { code: 500, message: 'Error while searching for events', details: err.message } });
      }

      callback(results);
    };
  }

  function _ensureNoSearchErrorAndOneResult(res, callback) {
    return _ensureNoSearchError(res, results => {
      if (results.list.length === 0) {
        return res.status(404).end();
      }

      callback(results.list[0]._source);
    });
  }

  function _buildEventString(event, locale) {
    if (event.location) {
      return i18n.__({ phrase: '%s, %s in %s', locale }, event.summary, moment(event.start).locale(locale).format('LLLL'), event.location);
    }

    return i18n.__({ phrase: '%s, %s', locale }, event.summary, moment(event.start).locale(locale).format('LLLL'));
  }

  function _calAction(promise, res) {
    promise.then(
      () => res.status(200).end(),
      err => res.status(500).json({ error: { code: 500, message: 'Error while updating calendar', details: err && err.message } })
    );
  }

};
