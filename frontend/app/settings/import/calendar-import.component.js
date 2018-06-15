(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .component('calCalendarImport', {
      controllerAs: 'ctrl',
      controller: 'CalCalendarImportController',
      templateUrl: '/calendar/app/settings/import/calendar-import.html'
    });
})(angular);
