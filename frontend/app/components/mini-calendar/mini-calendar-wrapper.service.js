(function() {
  'use strict';

  angular.module('esn.calendar')
    .factory('calMiniCalendarWrapperService', calMiniCalendarWrapperService);

  function calMiniCalendarWrapperService(
    $q,
    $log,
    _,
    miniCalendarService,
    calCachedEventSource,
    calMoment,
    calendarEventSource,
    CAL_MINI_CALENDAR_DAY_FORMAT
  ) {
    return function(calendar, calendars) {
      var originalEvents = {};
      var fakeEvents = {};
      var eventSourcesMap = buildEventSources(calendars);
      var eventSource = getEventSource();

      calendar.fullCalendar('addEventSource', eventSource);

      return {
        rerender: rerender,
        addCalendar: addCalendar,
        removeCalendar: removeCalendar
      };

      function getEventSource() {
        return {
          events: groupByDayEventSources
        };
      }

      function buildEventSources(calendars) {
        var eventSources = {};

        calendars.forEach(function(calendar) {
          eventSources[calendar.getUniqueId()] = buildEventSource(calendar);
        });

        return eventSources;
      }

      function buildEventSource(calendar) {
        return calCachedEventSource.wrapEventSource(calendar.getUniqueId(), calendarEventSource(calendar, function(error) {
          $log.error('Could not retrieve event sources', error);
        }));
      }

      function addOrDeleteEvent(add, event) {
        if (add) {
          originalEvents[event.id] = {
            id: event.id,
            start: calMoment(event.start),
            end: event.end && calMoment(event.end),
            allDay: event.allDay
          };
        } else {
          delete originalEvents[event.id];
        }

        miniCalendarService.forEachDayOfEvent(event, function(day) {
          var date = day.format(CAL_MINI_CALENDAR_DAY_FORMAT);
          var dayEvent = fakeEvents[date];

          if (!dayEvent) {
            dayEvent = fakeEvents[date] = {
              start: date,
              id: date,
              _num: 0,
              allDay: true
            };
          }

          dayEvent._num = dayEvent._num + (add ? 1 : -1);
          dayEvent.title = dayEvent._num > 99 ? '99+' : ('' + dayEvent._num);
        });
      }

      function groupByDayEventSources(start, end, timezone, callback) {
        var eventsPromise = [];

        originalEvents = {};
        fakeEvents = {};
        _.forEach(eventSourcesMap, function(calendarEventSource) {
          var deferred = $q.defer();

          eventsPromise.push(deferred.promise);
          calendarEventSource(start, end, timezone, deferred.resolve);
        });

        $q.all(eventsPromise).then(function(listOfEvents) {
          _.flatten(listOfEvents).forEach(addOrDeleteEvent.bind(null, true));
          calendar.fullCalendar('removeEvents');
          callback(_.values(fakeEvents));
        });
      }

      function rerender() {
        calendar.fullCalendar('refetchEvents');
      }

      function addCalendar(calendarShell) {
        eventSourcesMap[calendarShell.getUniqueId()] = buildEventSource(calendarShell);
        calendar.fullCalendar('removeEventSource', eventSource);
        eventSource = getEventSource();
        calendar.fullCalendar('addEventSource', eventSource);
      }

      function removeCalendar(calendarUniqueIdWrapper) {
        delete eventSourcesMap[calendarUniqueIdWrapper.uniqueId];

        calendar.fullCalendar('removeEventSource', eventSource);
        eventSource = getEventSource();
        calendar.fullCalendar('addEventSource', eventSource);
      }
    };
  }
})();
