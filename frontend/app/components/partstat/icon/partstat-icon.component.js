(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .component('calPartstatIcon', {
      templateUrl: '/calendar/app/components/partstat/icon/partstat-icon.html',
      controller: 'CalPartstatIconController',
      controllerAs: 'ctrl',
      bindings: {
        partstat: '='
      }
    });
})(angular);
