(function() {
  'use strict';

  angular.module('esn.calendar')
    .factory('calSearchEventProviderService', calSearchEventProviderService);

  function calSearchEventProviderService(
    $log,
    $q,
    _,
    $rootScope,
    calendarHomeService,
    calendarService,
    calEventService,
    newProvider,
    searchProviders,
    CAL_EVENTS,
    ELEMENTS_PER_REQUEST,
    esnI18nService
  ) {
    var service = {
      setUpSearchProvider: setUpSearchProvider
    };

    return service;

    ////////////

    function setUpSearchProvider() {
      return calendarHomeService.getUserCalendarHomeId()
        .then(buildProvider)
        .then(function(provider) {
          searchProviders.add(provider);
          return provider;
        });
    }

    function buildProvider(calendarHomeId) {

      return newProvider({
        name: esnI18nService.translate('Events'),
        fetch: function(query) {
          var offset = 0;

          function _setRelevance(event) {
            event.date = event.start;
          }

          function _searchInSingleCalendar(context, calendar) {
            var calendarToSearch = calendar.source ? calendar.source : calendar;

            return calEventService.searchEvents(calendarHomeId, calendarToSearch.id, context)
              .then(function(events) {
                offset += events.length;

                return events.map(function(event) {
                  event.calendar = calendar;
                  event.type = name;
                  _setRelevance(event);

                  return event;
                });
              });
          }

          return function() {
            var context = {
              query: query,
              offset: offset,
              limit: ELEMENTS_PER_REQUEST
            };

            var calendarsSearchResult = calendarService.listPersonalAndAcceptedDelegationCalendars(calendarHomeId)
              .then(function(calendars) {
                return $q.all(calendars.map(_.partial(_searchInSingleCalendar, context)));
              });

            return calendarsSearchResult
              .then(function(arrayOfPromisedResultEvents) {
                return _.sortBy(_.flatten(arrayOfPromisedResultEvents), function(event) { return -event.date; });
              });
          };
        },
        buildFetchContext: function(options) { return $q.when(options.query); },
        templateUrl: '/calendar/app/search/event/event-search-item',
        activeOn: ['calendar']
      });
    }
  }
})();
