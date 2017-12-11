'use strict';

angular.module('esn.calendar')
  .component('calEventParticipation', {
    controllerAs: 'ctrl',
    bindings: {
      changeParticipation: '=',
      userAsAttendee: '<'
    },
    templateUrl: '/calendar/app/components/event-participation/event-participation.html'
  });
