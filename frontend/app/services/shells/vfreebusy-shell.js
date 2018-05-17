(function() {
  'use strict';

  angular.module('esn.calendar')
    .factory('CalVfreebusyShell', CalVfreebusyShellFactory);

  function CalVfreebusyShellFactory(_, calMoment) {
    function CalVfreebusyShell(vfreebusy) {
      this.vfreebusy = vfreebusy;
    }

    CalVfreebusyShell.prototype = {
      isAvailable: isAvailable
    };

    return CalVfreebusyShell;

    ////////////

    /**
     * Return the availability for a given date
     * @param {string|date} dateOfAvailabilityStart - A date as string, object or any kind wrappable by calMoment
     * @param {string|date} dateOfAvailabilityEnd - A date as string, object or any kind wrappable by calMoment
     * @returns {boolean} Return true on available for the given date, false on unavailable
     * @memberOf esn.calendar.CalVfreebusyShellFactory
     */
    function isAvailable(dateOfAvailabilityStart, dateOfAvailabilityEnd) {
      var dtstart = calMoment(this.vfreebusy.getFirstPropertyValue('dtstart'));
      var dtend = calMoment(this.vfreebusy.getFirstPropertyValue('dtend'));
      var momentDateOfavailabilityStart = calMoment(dateOfAvailabilityStart);
      var momentDateOfavailabilityEnd = calMoment(dateOfAvailabilityEnd);

      if (!momentDateOfavailabilityStart.isBetween(dtstart, dtend) &&
          !momentDateOfavailabilityEnd.isBetween(dtstart, dtend) &&
          !dtstart.isBetween(momentDateOfavailabilityStart, momentDateOfavailabilityEnd) &&
          !dtend.isBetween(momentDateOfavailabilityStart, momentDateOfavailabilityEnd)) {
        return true;
      }

      return _.every(this.vfreebusy.getAllProperties('freebusy'), function(freeBusy) {
        var period = freeBusy.getFirstValue();
        var start = calMoment(period.start);
        var end = calMoment(period.end);

        var availabilityRequestedNotInBusyTime = !momentDateOfavailabilityStart.isBetween(start, end) &&
          !momentDateOfavailabilityEnd.isBetween(start, end);
        var busyTimeNotInAvailabilityRequested =
            !start.isBetween(momentDateOfavailabilityStart, momentDateOfavailabilityEnd) &&
          !end.isBetween(momentDateOfavailabilityStart, momentDateOfavailabilityEnd);

        return availabilityRequestedNotInBusyTime && busyTimeNotInAvailabilityRequested;
      });
    }
  }
})();
