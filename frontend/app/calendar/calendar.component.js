(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .component('calCalendar', {
      templateUrl: '/calendar/app/calendar/calendar.html',
      bindings: {
        calendarHomeId: '=',
        businessHours: '='
      },
      controllerAs: 'ctrl',
      controller: 'CalCalendarController'
  });
})(angular);
