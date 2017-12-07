(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .component('calAttendeeTabs', {
      templateUrl: '/calendar/app/components/attendee-tabs/attendee-tabs.html',
      bindings: {
        selectedTab: '='
      }
    });
})(angular);
