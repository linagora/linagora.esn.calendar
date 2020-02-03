const moment = require('moment');
const getEventUidFromElasticsearchId = require('../../../lib/search/denormalize').getEventUidFromElasticsearchId;

module.exports = function(dependencies) {
  const i18n = dependencies('i18n');
  const logger = dependencies('logger');
  const elasticsearchActions = require('../../../lib/search/actions')(dependencies);
  const calDavClient = require('../../../lib/caldav-client')(dependencies);

  return {
    getNextEvent,
    newEventInDefaultCalendar,
    cancelNextEvent,
    search
  };

  /////

  function getNextEvent(req, res) {
    elasticsearchActions.searchNextEvent(req.user, _ensureNoSearchErrorAndOneResult(res, event => {
      if (req.accepts('json')) {
        return res.status(200).json(event);
      }

      res.status(200).send(_buildEventString(event, req.getLocale())); // Defaults to a human readable, text String
    }));
  }

  function cancelNextEvent(req, res) {
    elasticsearchActions.searchNextEvent(req.user, _ensureNoSearchErrorAndOneResult(res, event => _calAction(calDavClient.deleteEventInDefaultCalendar(req.user, event.uid), res)));
  }

  function newEventInDefaultCalendar(req, res) {
    const { summary, location } = req.body,
          locale = req.getLocale(),
          start = require(`./locales/${locale}`)(dependencies)(req.body.when, locale);

    _calAction(calDavClient.createEventInDefaultCalendar(req.user, { summary, location, start }), res);
  }

  function search(req, res) {
    const query = {
      calendars: req.body.calendars,
      search: req.body.query,
      attendees: req.body.attendees,
      organizers: req.body.organizers,
      offset: req.query.offset,
      limit: req.query.limit,
      sortKey: req.query.sortKey,
      sortOrder: req.query.sortOrder,
      userId: req.user.id
    };

    return elasticsearchActions.searchEvents(query)
      .then(result => ({
        totalCount: result.total_count,
        events: result.list.map(event => ({
          path: calDavClient.getEventPath(event._source.userId, event._source.calendarId, getEventUidFromElasticsearchId(event._id)),
          data: event._source
        }))
      }))
      .then(searchResult => {
        const events = searchResult.events.map(event => ({
          _links: {
            self: {
              href: event.path
            }
          },
          data: event.data
        }));

        res.header('X-ESN-Items-Count', searchResult.totalCount);
        res.status(200).json({
          _links: {
            self: {
              href: req.originalUrl
            }
          },
          _total_hits: searchResult.totalCount,
          _embedded: {
            events
          }
        });
      })
      .catch(err => {
        const details = 'Error while searching for events';

        logger.error(details, err);

        res.status(500).json({
          error: {
            code: 500,
            message: 'Server Error',
            details
          }
        });
      });
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
