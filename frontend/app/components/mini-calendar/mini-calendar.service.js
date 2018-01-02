(function() {
  'use strict';

  angular.module('esn.calendar')
    .factory('miniCalendarService', miniCalendarService);

  function miniCalendarService($q, $log, _, calCachedEventSource, calMoment, calendarEventSource, CAL_MINI_CALENDAR_DAY_FORMAT) {
    var service = {
      forEachDayOfEvent: forEachDayOfEvent,
      getWeekAroundDay: getWeekAroundDay,
      miniCalendarWrapper: miniCalendarWrapper
    };

    return service;

    ////////////

    function forEachDayOfEvent(event, callback) {
      var day = calMoment(event.start);
      var end = calMoment(event.end || event.start);

      if (!(event.allDay && event.end)) {
        end.add(1, 'days');
      }

      // avoid infinite loop if for some nasty reason end has been set to a date before start
      if (day.isAfter(end)) {
        return callback(calMoment(day));
      }

      //subtract one minute if the event finish at midnight to fix the condition day.isSame(end, 'day')
      if (!event.allDay && event.end && event.end.hour() === 0 && event.end.minute() === 0) {
        end.subtract(1, 'minutes');
      }

      while (!day.isSame(end, 'day')) {
        callback(calMoment(day));
        day.add(1, 'days');
      }
    }

    function getWeekAroundDay(calendarConfig, day) {
      var firstDay = calendarConfig.firstDay;

      //if no firstDay default in config, I assume local of moment
      //is the same as fullcalendar local for first day of the week
      var firstWeekDay = firstDay ?
        calMoment(day).isoWeekday(firstDay) : calMoment(day).weekday(0);

      if (firstWeekDay.isAfter(day)) {
        firstWeekDay.subtract(7, 'days');
      }

      var nextFirstWeekDay = calMoment(firstWeekDay).add(7, 'days');

      return {
        firstWeekDay: firstWeekDay,
        nextFirstWeekDay: nextFirstWeekDay
      };
    }

    function miniCalendarWrapper(calendar, calendars) {
      var originalEvents = {};
      var fakeEvents = {};
      var eventSourcesMap = buildEventSources(calendars);
      var eventSource = getEventSource();

      calendar.fullCalendar('addEventSource', eventSource);

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

        forEachDayOfEvent(event, function(day) {
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

      return {
        rerender: rerender,
        addCalendar: addCalendar,
        removeCalendar: removeCalendar
      };
    }
  }

})();
