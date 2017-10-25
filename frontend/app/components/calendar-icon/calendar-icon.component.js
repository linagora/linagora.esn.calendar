(function() {
  'use strict';

  angular.module('esn.calendar')
    .component('calendarIcon', {
      templateUrl: '/calendar/app/components/calendar-icon/calendar-icon.html',
      bindings: {
        isResource: '=?',
        calendarIcon: '=?',
        calendarColor: '=?',
        selected: '=?',
        isHover: '=?'
      }
    });
})();
