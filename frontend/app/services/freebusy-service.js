(function() {
  'use strict';

  angular.module('esn.calendar')
         .service('calFreebusyService', calFreebusyService);

  function calFreebusyService(
    $q,
    $rootScope,
    _,
    CalVfreebusyShell,
    calendarAPI,
    calendarService,
    calFreebusyAPI,
    calPathBuilder,
    ICAL
  ) {
    this.listFreebusy = listFreebusy;

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
  }
})();
