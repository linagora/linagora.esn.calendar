(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .component('calInboxResourceManagementBlueBar', {
      controller: 'calInboxResourceManagementBlueBarController',
      bindings: {
        message: '<'
      },
      templateUrl: '/calendar/app/components/inbox/resource-management-blue-bar/resource-management-blue-bar.html'
    });
})(angular);
