(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .component('calendarConfigForm', {
      templateUrl: '/calendar/app/components/calendar-config-form/calendar-config-form.html',
      bindings: {
        configurations: '='
      }
    });

})(angular);
