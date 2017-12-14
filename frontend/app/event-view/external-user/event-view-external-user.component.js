(function() {
  'use strict';

  angular.module('esn.calendar')
    .component('calEventExternalUserView', {
      bindings: {
        event: '<',
        attendees: '<',
        externalAttendee: '<',
        links: '<'
      },
      controller: 'CalEventViewExternalUserController',
      controllerAs: 'ctrl',
      templateUrl: '/calendar/app/event-view/event-view-body.html'
    });
})();
