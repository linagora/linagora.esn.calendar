(function() {
  'use strict';

  angular.module('esn.calendar')
    .component('calEventView', {
      bindings: {
        event: '<',
        externalAttendee: '<',
        links: '<'
      },
      controller: 'CalEventViewController',
      controllerAs: 'ctrl',
      templateUrl: '/calendar/app/event-view/event-view.html'
    });
})();
