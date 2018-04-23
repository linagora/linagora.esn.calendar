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
     * @param {string|date} dateOfAvailability - A date as string, object or any kind wrappable by calMoment
     * @returns {boolean} Return true on available for the given date, false on unavailable
     * @memberOf esn.calendar.CalVfreebusyShellFactory
     */
    function isAvailable(dateOfAvailability) {
      var dtstart = calMoment(this.vfreebusy.getFirstPropertyValue('dtstart'));
      var dtend = calMoment(this.vfreebusy.getFirstPropertyValue('dtend'));
      var momentDateOfavailability = calMoment(dateOfAvailability);

      if (!momentDateOfavailability.isBetween(dtstart, dtend)) {
        return true;
      }

      return _.every(this.vfreebusy.getAllProperties('freebusy'), function(freeBusy) {
        var period = freeBusy.getFirstValue();
        var start = calMoment(period.start);
        var end = calMoment(period.end);

        return !momentDateOfavailability.isBetween(start, end);
      });
    }
  }
})();
