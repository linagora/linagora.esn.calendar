(function() {
  'use strict';

  angular.module('esn.calendar')
    .component('calSettingsDisplay', {
      controllerAs: 'ctrl',
      controller: 'CalSettingsDisplayController',
      templateUrl: '/calendar/app/settings/display/settings-display.html'
    });
})();
