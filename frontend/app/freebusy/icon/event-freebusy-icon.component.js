(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .component('calFreebusyIcon', {
      templateUrl: '/calendar/app/freebusy/icon/event-freebusy-icon.html',
      controller: 'CalFreebusyIconController',
      controllerAs: 'ctrl',
      bindings: {
        status: '='
      }
    });
})(angular);
