'use strict';

angular.module('esn.calendar')
  .component('calAttendeeItem', {
    templateUrl: '/calendar/app/components/attendee/attendee-item/attendee-item.html',
    bindings: {
      attendee: '=',
      canModifyAttendee: '=',
      isOrganizer: '='
    },
    controllerAs: 'ctrl'
  });
