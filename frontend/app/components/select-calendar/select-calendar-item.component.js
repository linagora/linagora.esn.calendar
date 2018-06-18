(function(angular) {
  'use strict';

  angular.module('esn.calendar').component('calSelectCalendarItem', {
    bindings: {
      calendar: '='
    },
    templateUrl: '/calendar/app/components/select-calendar/select-calendar-item.html',
    controller: 'CalSelectCalendarItemController',
    controllerAs: 'ctrl'
  });
})(angular);
