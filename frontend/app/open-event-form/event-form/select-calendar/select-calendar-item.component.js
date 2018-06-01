(function(angular) {
  'use strict';

  angular.module('esn.calendar').component('calEventFormSelectCalendarItem', {
    bindings: {
      calendar: '='
    },
    templateUrl: '/calendar/app/open-event-form/event-form/select-calendar/select-calendar-item.html',
    controller: 'CalEventFormSelectCalendarItemController',
    controllerAs: 'ctrl'
  });
})(angular);
