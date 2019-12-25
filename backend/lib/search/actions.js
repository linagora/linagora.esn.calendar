const { SEARCH } = require('../constants');

module.exports = dependencies => {
  const elasticsearch = dependencies('elasticsearch');
  const logger = dependencies('logger');

  return {
    searchEventsBasic,
    searchEventsAdvanced,
    searchNextEvent
  };

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

    const filterOccur = _getNextEventSearchFilter(query);

    return _searchEventsFromElasticsearch({ query, mustOccur, filterOccur }, callback);
  }

  function searchEventsBasic(query, callback) {
    const mustOccur = _getMultiMatchQuery(query.search);
    const filterOccur = _getBasicSearchFilter(query);

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

  function _getBasicSearchFilter({ calendarId }) {
    return {
      term: {
        calendarId
      }
    };
  }

  function _getNextEventSearchFilter({ userId }) {
    return {
      term: {
        userId
      }
    };
  }

  function _getAdvancedSearchFilters(query) {
    const filters = [];

    if (Array.isArray(query.calendars) && query.calendars.length) {
      filters.push({
        bool: {
          should: query.calendars.map(queryCalendar => ({
            bool: {
              filter: [
                {
                  term: {
                    calendarId: queryCalendar.calendarId
                  }
                },
                {
                  term: {
                    userId: queryCalendar.userId
                  }
                }
              ]
            }
          }))
        }
      });
    }

    if (Array.isArray(query.organizers) && query.organizers.length) {
      filters.push({
        terms: {
          'organizer.email.full': query.organizers
        }
      });
    }

    return filters;
  }
};
