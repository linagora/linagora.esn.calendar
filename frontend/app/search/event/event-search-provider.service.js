(function() {
  'use strict';

  angular.module('esn.calendar')
    .factory('calSearchEventProviderService', calSearchEventProviderService);

  function calSearchEventProviderService(
    $q,
    _,
    calendarHomeService,
    calendarService,
    calEventService,
    esnSearchProvider,
    userAndExternalCalendars,
    ELEMENTS_PER_REQUEST,
    CAL_ADVANCED_SEARCH_CALENDAR_TYPES
  ) {

    return function() {
      return calendarHomeService.getUserCalendarHomeId().then(buildProvider);
    };

    function buildProvider(calendarHomeId) {
      return new esnSearchProvider({
        uid: 'op.events',
        name: 'Events',
        fetch: function(query) {
          var offset = 0;

          return function() {
            var options = {
              query: query,
              offset: offset,
              limit: ELEMENTS_PER_REQUEST
            };

            var eventSearch = calendarService.listPersonalAndAcceptedDelegationCalendars(calendarHomeId)
              .then(function(calendars) {
                if (!query.advanced || _.isEmpty(query.advanced) || !query.advanced.cal) {
                  return $q.all(calendars.map(_.partial(_searchInSingleCalendar, options)));
                }

                switch (query.advanced.cal) {
                  case CAL_ADVANCED_SEARCH_CALENDAR_TYPES.ALL_CALENDARS:
                    options.calendars = calendars;
                    break;
                  case CAL_ADVANCED_SEARCH_CALENDAR_TYPES.MY_CALENDARS:
                    options.calendars = userAndExternalCalendars(calendars).userCalendars;
                    break;
                  case CAL_ADVANCED_SEARCH_CALENDAR_TYPES.SHARED_CALENDARS:
                    var categorizedCalendars = userAndExternalCalendars(calendars);

                    options.calendars = (categorizedCalendars.publicCalendars || [])
                      .concat(categorizedCalendars.sharedCalendars || []);
                    break;
                  default:
                    options.calendars = calendars.filter(function(calendar) {
                      return calendar.id === query.advanced.cal;
                    });
                }

                options.userId = calendarHomeId;

                return _searchEventsAdvanced(options);
              });

            return eventSearch
              .then(function(arrayOfPromisedResultEvents) {
                return _.sortBy(_.flatten(arrayOfPromisedResultEvents), function(event) { return -event.date; });
              });
          };

          function _searchInSingleCalendar(context, calendar) {
            var calendarToSearch = calendar.source ? calendar.source : calendar;

            return calEventService.searchEventsBasic(calendarHomeId, calendarToSearch.id, context)
              .then(function(events) {
                offset += events.length;

                return events.map(function(event) {
                  event.calendar = calendar;
                  event.type = name;
                  event.date = event.start;

                  return event;
                });
              });
          }

          function _searchEventsAdvanced(options) {
            return calEventService.searchEventsAdvanced(options)
              .then(function(events) {
                offset += events.length;

                return events.map(function(event) {
                  event.calendar = _.find(options.calendars, function(calendar) {
                    return calendar.source ? calendar.source.id === event.calendarId : calendar.id === event.calendarId;
                  });
                  event.type = name;
                  event.date = event.start;

                  return event;
                });
              });
          }
        },
        buildFetchContext: function(options) { return $q.resolve(options.query); },
        cleanQuery: function(query) {
          function _getCleanedUserObjects(userObjects) {
            return userObjects.map(function(userObject) {
              return {
                id: userObject.id,
                email: userObject.email,
                displayName: userObject.displayName
              };
            });
          }

          function _cleanUserFilter(userFilterKey) {
            if (Array.isArray(query.advanced[userFilterKey]) && !query.advanced[userFilterKey].length) {
              return delete query.advanced[userFilterKey];
            }

            query.advanced[userFilterKey] = _getCleanedUserObjects(query.advanced[userFilterKey]);
          }

          if (!query || !query.advanced) {
            return query;
          }

          if (query.advanced.organizers) {
            _cleanUserFilter('organizers');
          }

          if (query.advanced.attendees) {
            _cleanUserFilter('attendees');
          }

          return query;
        },
        templateUrl: '/calendar/app/search/event/event-search-item.html',
        searchTemplateUrl: '/calendar/app/search/form/search-form-template.html',
        activeOn: ['calendar'],
        placeHolder: 'Search in events'
      });
    }
  }
})();
