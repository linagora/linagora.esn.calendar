(function() {
  'use strict';

  angular.module('esn.calendar')
    .factory('calPathBuilder', calPathBuilder);

  function calPathBuilder(CAL_DEFAULT_CALENDAR_ID) {
    var service = {
      rootPath: rootPath,
      forCalendarPath: forCalendarPath,
      forCalendarHomeId: forCalendarHomeId,
      forCalendarId: forCalendarId,
      forEventId: forEventId,
      forSubscriptionId: forSubscriptionId
    };

    return service;

    ////////////

    function rootPath() {
      return '/calendars';
    }

    function forCalendarHomeId(calendarHomeId) {
      return rootPath() + '/' + calendarHomeId + '.json';
    }

    function forCalendarPath(calendarHomeId, calendarId) {
      return rootPath() + '/' + calendarHomeId + '/' + calendarId;
    }

    function forCalendarId(calendarHomeId, calendarId) {
      return forCalendarPath(calendarHomeId, calendarId) + '.json';
    }

    function forEventId(calendarHomeId, eventId) {
      return (rootPath() + '/' + calendarHomeId + '/' + CAL_DEFAULT_CALENDAR_ID).replace(/\/$/, '') + '/' + eventId + '.ics';
    }

    function forSubscriptionId(calendarHomeId, subscriptionId) {
      return rootPath() + '/' + calendarHomeId + '/' + subscriptionId + '.json';
    }
  }

})();
