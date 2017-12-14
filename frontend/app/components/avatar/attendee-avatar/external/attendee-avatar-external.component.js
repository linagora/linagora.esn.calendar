(function() {
  'use strict';

  angular.module('esn.calendar')
    .component('calAttendeeAvatarExternal', {
      templateUrl: '/calendar/app/components/avatar/attendee-avatar/external/attendee-avatar-external.html',
      bindings: {
        attendee: '<',
        isOrganizer: '<'
      },
      controllerAs: 'ctrl',
      controller: 'CalAttendeeAvatarController'
    });
})();
