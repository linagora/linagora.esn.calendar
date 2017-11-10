(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .component('calCalendarPlanning', {
      bindings: {
        // listDay (default), listWeek, listMonth, listYear
        viewMode: '=?'
      },
      controller: 'CalCalendarPlanningController',
      controllerAs: 'ctrl',
      templateUrl: '/calendar/app/planning/calendar-planning.html'
    });
})(angular);
