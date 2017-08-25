(function() {
  'use strict';

  angular.module('esn.calendar')
    .component('calCalendarMain', {
      templateUrl: '/calendar/app/calendar/calendar-main.html',
      bindings: {
        calendarHomeId: '=',
        businessHours: '='
      },
      controllerAs: 'ctrl',
      controller: 'calCalendarMainController'
  });
})();
