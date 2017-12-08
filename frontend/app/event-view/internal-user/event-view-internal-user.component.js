(function() {
  'use strict';

  angular.module('esn.calendar')
    .component('calEventInternalUserView', {
      bindings: {
        event: '<',
        attendees: '<'
      },
      controller: 'CalEventViewInternalUserController',
      controllerAs: 'ctrl',
      templateUrl: '/calendar/app/event-view/event-view-body.html'
    });
})();
