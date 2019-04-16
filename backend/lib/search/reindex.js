const Q = require('q');
const { SEARCH } = require('../constants');

module.exports = dependencies => {
  const coreDomain = dependencies('domain');
  const {
    getAllCalendarsInDomainAsTechnicalUser,
    getAllEventsInCalendarAsTechnicalUser
  } = require('../caldav-client')(dependencies);
  const { getOptions } = require('./searchHandler')(dependencies);
  const { reindexRegistry } = dependencies('elasticsearch');

  return {
    register
  };

  function register() {
    reindexRegistry.register(SEARCH.TYPE_NAME, {
      name: SEARCH.INDEX_NAME,
      buildReindexOptionsFunction: _buildReindexOptions
    });
  }

  function _buildReindexOptions() {
    const options = getOptions();

    options.name = SEARCH.INDEX_NAME;

    return _listEventsByCursor()
      .then(cursor => {
        options.next = cursor.next;

        return options;
      });
  }

  function _listEventsByCursor() {
    return _getAllCalendarsInSystem()
      .then(calendars => {
        let i = 0;

        return {
          next
        };

        function next() {
          if (!calendars[i]) return Promise.resolve();

          const options = calendars[i];

          i++;

          return getAllEventsInCalendarAsTechnicalUser(options)
            .then(events => {
              if (events.length === 0) return next();

              return events;
            });
        }
      });
  }

  function _getAllCalendarsInSystem() {
    return Q.ninvoke(coreDomain, 'list', {})
      .then(domains => {
        const promises = domains.map(domain => getAllCalendarsInDomainAsTechnicalUser(domain._id));

        return Q.allSettled(promises)
          .then(results => {
            results = results.map(({ state, value }) => (state === 'fulfilled') && value).filter(Boolean);

            return [].concat.apply([], results);
          });
      });
  }
};
