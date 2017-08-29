(function() {
  'use strict';

  angular.module('esn.calendar')
    .factory('calSearchEventProviderService', calSearchEventProviderService);

  function calSearchEventProviderService(
    $log,
    $q,
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
      getAll: getAll,
      getForCalendar: getForCalendar,
      setUpSearchProviders: setUpSearchProviders
    };

    return service;

    ////////////

    function setUpSearchProviders() {
      searchProviders.add(getAll());

      setUpListeners();
    }

    function getAll() {
      return calendarHomeService.getUserCalendarHomeId()
        .then(function(calendarHomeId) {
          return calendarService.listPersonalAndAcceptedDelegationCalendars(calendarHomeId);
        })
        .then(function(calendars) {
          return calendars.map(getForCalendar);
        }, function(error) {
          $log.error('Could not register search providers for calendar module', error);

          return [];
        });
    }

    function getForCalendar(calendar) {
      return buildProvider(calendar);
    }

    function buildProvider(calendar) {
      return newProvider({
        name: esnI18nService.translate('Events from %s', calendar.name),
        id: calendar.getUniqueId(),
        fetch: function(query) {
          var offset = 0;

          function _setRelevance(event) {
            event.date = event.start;
          }

          return function() {
            var context = {
              query: query,
              offset: offset,
              limit: ELEMENTS_PER_REQUEST
            };
            var calendarToSearch = calendar.source ? calendar.source : calendar;

            return calEventService.searchEvents(calendarToSearch.calendarHomeId, calendarToSearch.id, context)
              .then(function(events) {
                offset += events.length;

                return events.map(function(event) {
                  event.calendar = calendar;
                  event.type = name;
                  _setRelevance(event);

                  return event;
                });
              });
          };
        },
        buildFetchContext: function(options) { return $q.when(options.query); },
        templateUrl: '/calendar/app/search/event/event-search-item'
      });
    }

    function setUpListeners() {
      $rootScope.$on(CAL_EVENTS.CALENDARS.ADD, function(event, calendar) {
        _addCalendarInSearchProviders(calendar);
      });

      $rootScope.$on(CAL_EVENTS.CALENDARS.REMOVE, function(event, calendar) {
        _removeCalendarFromSearchProviders(calendar);
      });

      $rootScope.$on(CAL_EVENTS.CALENDARS.UPDATE, function(event, calendar) {
        _removeCalendarFromSearchProviders(calendar);
        _addCalendarInSearchProviders(calendar);
      });

      function _addCalendarInSearchProviders(calendar) {
        searchProviders.add(getForCalendar(calendar));
      }

      function _removeCalendarFromSearchProviders(calendar) {
        searchProviders.remove(function(provider) {
          return provider.id === calendar.uniqueId;
        });
      }
    }
  }
})();
