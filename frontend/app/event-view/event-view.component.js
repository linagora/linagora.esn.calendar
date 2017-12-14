(function() {
  'use strict';

  angular.module('esn.calendar')
    .component('calEventView', {
      bindings: {
        event: '<',
        externalAttendee: '<',
        links: '<'
      },
      controllerAs: 'ctrl',
      controller: 'CalEventViewController',
      templateUrl: '/calendar/app/event-view/event-view.html'
    });
})();
