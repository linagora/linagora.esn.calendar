(function() {
  'use strict';

  angular.module('esn.calendar')
    .component('calSettingsCalendarsItem', {
      bindings: {
        calendar: '<'
      },
      controllerAs: 'ctrl',
      controller: 'CalSettingsCalendarsItemController',
      templateUrl: '/calendar/app/settings/calendars/item/settings-calendars-item.html'
    });
})();
