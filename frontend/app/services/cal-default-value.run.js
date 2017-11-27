(function() {
  'use strict';

  angular.module('esn.calendar')
    .run(setDefaultCalendarId);

  function setDefaultCalendarId(calendarService, calDefaultValue, calendarHomeService) {
    var calHomeId;
    var CAL_DEFAULT_OLD_CALENDAR_ID = 'events';

    calendarHomeService.getUserCalendarHomeId()
      .then(function(calendarHomeId) {
        calHomeId = calendarHomeId;

        return calendarService.getCalendar(calendarHomeId, CAL_DEFAULT_OLD_CALENDAR_ID);
      })
      .then(function(calendar) {
        return calendar && CAL_DEFAULT_OLD_CALENDAR_ID;
      })
      .catch(function(err) {
        if (err && err.status === 404) {
          return calHomeId;
        }

        return CAL_DEFAULT_OLD_CALENDAR_ID;
      })
      .then(function(defaultCalId) {
        calDefaultValue.set('calendarId', defaultCalId);
      });
  }
})();
