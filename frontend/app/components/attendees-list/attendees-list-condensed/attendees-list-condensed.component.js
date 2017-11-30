(function() {
  'use strict';

  angular.module('esn.calendar')
    .component('calAttendeesListCondensed', {
      bindings: {
        attendees: '=',
        canModifyAttendees: '=',
        organizer: '=',
        onAttendeesRemoved: '&'
      },
      controller: 'CalAttendeesListController',
      controllerAs: 'ctrl',
      templateUrl: '/calendar/app/components/attendees-list/attendees-list-condensed/attendees-list-condensed.html'
    });
})();
