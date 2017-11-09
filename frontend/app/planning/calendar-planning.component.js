(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .component('calCalendarPlanning', {
      controller: 'CalCalendarPlanningController',
      controllerAs: 'ctrl',
      templateUrl: '/calendar/app/planning/calendar-planning.html'
    });
})(angular);
