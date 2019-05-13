'use strict';

var SEARCH = require('../constants').SEARCH;

module.exports = dependencies => {
  const logger = dependencies('logger');
  const elasticsearch = dependencies('elasticsearch');
  const listener = require('./searchHandler')(dependencies);
  const pubsub = require('./pubsub')(dependencies);
  let searchHandler;

  return {
    indexEvent,
    listen,
    removeEventFromIndex,
    searchEventsBasic,
    searchEventsAdvanced,
    searchNextEvent
  };

  function indexEvent(event, callback) {
    if (!searchHandler) {
      return callback(new Error('Event search is not initialized'));
    }

    if (!event) {
      return callback(new Error('Event is required'));
    }

    searchHandler.indexData(event, callback);
  }

  function removeEventFromIndex(event, callback) {
    if (!searchHandler) {
      return callback(new Error('Event search is not initialized'));
    }

    if (!event) {
      return callback(new Error('Event is required'));
    }

    searchHandler.removeFromIndex(event, callback);
  }

  function searchNextEvent(user, callback) {
    const mustOccur = {
      range: {
        start: {
          gt: 'now'
        }
      }
    };

    const query = {
      limit: 1,
      sortKey: 'start',
      sortOrder: 'asc',
      userId: user.id
    };

    const filterOccur = _getBasicSearchFilters(query);

    return _searchEventsFromElasticsearch({ query, mustOccur, filterOccur }, callback);
  }

  function searchEventsBasic(query, callback) {
    const mustOccur = _getMultiMatchQuery(query.search);
    const filterOccur = _getBasicSearchFilters(query);

    return _searchEventsFromElasticsearch({ query, mustOccur, filterOccur }, callback);
  }

  function searchEventsAdvanced(query) {
    const filterOccur = _getAdvancedSearchFilters(query);
    const mustOccur = [_getMultiMatchQuery(query.search)];

    if (Array.isArray(query.attendees) && query.attendees.length) {
      mustOccur.push({
        terms: {
          'attendees.email.full': query.attendees
        }
      });
    }

    return new Promise((resolve, reject) => {
      _searchEventsFromElasticsearch({ query, mustOccur, filterOccur }, (error, esResults) => {
        if (error) return reject(error);

        return resolve(esResults);
      });
    });
  }

  function _searchEventsFromElasticsearch({ query, mustOccur, filterOccur }, callback) {
    const offset = query.offset || 0;
    const limit = 'limit' in query ? query.limit : SEARCH.DEFAULT_LIMIT;
    const sortKey = query.sortKey || SEARCH.DEFAULT_SORT_KEY;
    const sortOrder = query.sortOrder || SEARCH.DEFAULT_SORT_ORDER;
    const sort = {};

    sort[sortKey] = {
      order: sortOrder
    };

    const esQuery = {
      query: {
        bool: {
          must: mustOccur
        }
      },
      sort
    };

    if (filterOccur) {
      esQuery.query.bool.filter = filterOccur;
    }

    logger.debug('Searching events with options', {
      userId: query.userId,
      esQuery,
      offset,
      limit,
      sort
    });

    elasticsearch.searchDocuments({
      index: SEARCH.INDEX_NAME,
      type: SEARCH.TYPE_NAME,
      from: offset,
      size: limit,
      body: esQuery
    }, (err, result) => {
      if (err) {
        return callback(err);
      }

      callback(null, {
        total_count: result.hits.total,
        list: result.hits.hits
      });
    });
  }

  function _getMultiMatchQuery(terms) {
    return {
      multi_match: {
        query: terms,
        type: 'cross_fields',
        fields: [
          'summary',
          'description',
          'organizer.cn',
          'organizer.email',
          'attendees.email',
          'attendees.cn'
        ],
        operator: 'and',
        tie_breaker: 0.5
      }
    };
  }

  function _getBasicSearchFilters({ userId, calendarId }) {
    const filters = [];

    if (calendarId) {
      filters.push({
        term: {
          calendarId
        }
      });
    }

    if (userId) {
      filters.push({
        term: {
          userId
        }
      });
    }

    return filters;
  }

  function _getAdvancedSearchFilters(query) {
    const filters = [];

    let calendarIds = [];

    if (Array.isArray(query.calendars) && query.calendars.length) {
      calendarIds = query.calendars.map(calendar => calendar.calendarId);
    }

    filters.push({
      terms: {
        calendarId: calendarIds
      }
    });

    if (Array.isArray(query.organizers) && query.organizers.length) {
      filters.push({
        terms: {
          'organizer.email.full': query.organizers
        }
      });
    }

    return filters;
  }

  function listen() {
    logger.info('Subscribing to event updates for indexing');
    pubsub.listen();
    searchHandler = listener.register();

    logger.info('Register reindexing for calendar events');
    require('./reindex')(dependencies).register();
  }
};
