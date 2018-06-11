(function() {
  'use strict';

  angular.module('esn.calendar')
    .component('calAttendeeList', {
      bindings: {
        attendees: '=',
        canModifyAttendees: '=',
        organizer: '=',
        onAttendeesRemoved: '&'
      },
      controller: 'CalAttendeeListController',
      controllerAs: 'ctrl',
      templateUrl: '/calendar/app/components/attendee/list/attendee-list.html'
    });
})();
