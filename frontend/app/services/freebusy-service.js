(function() {
  'use strict';

  angular.module('esn.calendar')
         .service('calFreebusyService', calFreebusyService);

  function calFreebusyService(
    $q,
    $rootScope,
    _,
    CalVfreebusyShell,
    calFreebusyAPI,
    calPathBuilder,
    calendarAPI,
    calendarService,
    calMoment,
    ICAL
  ) {
    this.listFreebusy = listFreebusy;
    this.isAttendeeAvailable = isAttendeeAvailable;

    ////////////

    function listFreebusy(userId, start, end) {
      return calendarService.listFreeBusyCalendars(userId).then(function(cals) {
        var calPromises = cals.map(function(cal) {
          return calFreebusyAPI.report(calPathBuilder.forCalendarId(userId, cal.id), start, end);
        });

        return $q.all(calPromises)
          .then(function(freebusies) {
            return freebusies.map(function(freebusy) {
              var vcalendar = new ICAL.Component(freebusy);
              var vfreebusy = vcalendar.getFirstSubcomponent('vfreebusy');

              return new CalVfreebusyShell(vfreebusy);
            });
          });
      }).catch($q.reject);
    }

    /**
     * @name isAttendeeAvailable
     * @description For a given datetime period, determine if user is Free or Busy, for all is calendars
     * @param {string} attendeeId - Id of the attendee
     * @param {string} dateStart - Starting date of the requested period
     * @param {string} dateEnd - Ending date of the requested period
     * @return {boolean} true on free, false on busy
     */
    function isAttendeeAvailable(attendeeId, dateStart, dateEnd) {
      var start = calMoment(dateStart);
      var end = calMoment(dateEnd);

      return listFreebusy(attendeeId, start, end)
        .then(function(freeBusies) {
          return _.every(freeBusies, function(freeBusy) {
            return freeBusy.isAvailable(start, end);
          });
        })
        .catch($q.reject);
    }
  }
})();
