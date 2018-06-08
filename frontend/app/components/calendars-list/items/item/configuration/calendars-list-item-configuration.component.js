(function(angular) {
    'use strict';

    angular.module('esn.calendar')
      .component('calCalendarsListItemConfiguration', {
        templateUrl: '/calendar/app/components/calendars-list/items/item/configuration/configuration-list.html',
        controller: 'CalendarsListItemConfigurationController',
        bindings: {
          calendarId: '='
        }
      });
  })(angular);
