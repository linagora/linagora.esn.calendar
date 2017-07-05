(function() {
  'use strict';

  angular.module('esn.calendar')
    .component('calSettingsCalendars', {
      controllerAs: 'ctrl',
      controller: 'CalSettingsCalendarsController',
      templateUrl: '/calendar/app/settings/calendars/settings-calendars.html'
    });
})();
