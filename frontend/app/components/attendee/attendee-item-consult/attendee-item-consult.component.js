(function() {
  'use strict';

  angular.module('esn.calendar')
    .component('calAttendeeItemConsult', {
      bindings: {
        attendee: '=',
        isOrganizer: '<',
        isExternal: '<'
      },
      controllerAs: 'ctrl',
      controller: 'CalAttendeeItemConsultController',
      templateUrl: '/calendar/app/components/attendee/attendee-item-consult/attendee-item-consult.html'
    });
})();
