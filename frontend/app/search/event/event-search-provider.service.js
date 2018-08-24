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
    esnSearchProvider,
    CAL_EVENTS,
    ELEMENTS_PER_REQUEST,
    esnI18nService
  ) {

    return function() {
      return calendarHomeService.getUserCalendarHomeId().then(buildProvider);
    };

    function buildProvider(calendarHomeId) {
      return new esnSearchProvider({
        uid: 'op.events',
        name: esnI18nService.translate('Events'),
        fetch: function(query) {
          var offset = 0;

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

          function _searchInSingleCalendar(context, calendar) {
            var calendarToSearch = calendar.source ? calendar.source : calendar;

            return calEventService.searchEvents(calendarHomeId, calendarToSearch.id, context)
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
        },
        buildFetchContext: function(options) { return $q.when(options.query && options.query.text); },
        templateUrl: '/calendar/app/search/event/event-search-item.html',
        activeOn: ['calendar']
      });
    }
  }
})();
