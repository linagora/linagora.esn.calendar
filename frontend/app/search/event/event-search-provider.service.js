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
    ELEMENTS_PER_REQUEST
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
        searchTemplateUrl: '/calendar/app/search/form/search-form-template.html',
        activeOn: ['calendar'],
        placeHolder: 'Search in events'
      });
    }
  }
})();
