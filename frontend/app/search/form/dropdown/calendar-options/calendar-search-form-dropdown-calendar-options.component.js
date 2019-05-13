(function(angular) {
  'use strict';

  angular.module('esn.calendar').component('calendarSearchFormDropdownCalendarOptions', {
    templateUrl: '/calendar/app/search/form/dropdown/calendar-options/calendar-search-form-dropdown-calendar-options.html',
    bindings: {
      calendarList: '<'
    }
  });
})(angular);
