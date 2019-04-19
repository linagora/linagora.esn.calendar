(function(angular) {
  'use strict';

  angular.module('esn.calendar').component('calendarSearchFormDropdown', {
    templateUrl: '/calendar/app/search/form/dropdown/calendar-search-form-dropdown.html',
    controller: 'calendarSearchFormDropdownController',
    bindings: {
      calendars: '<',
      selectedCal: '='
    }
  });
})(angular);
