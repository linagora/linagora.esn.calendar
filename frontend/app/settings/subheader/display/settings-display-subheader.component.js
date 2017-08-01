(function() {
  'use strict';

  angular.module('esn.calendar')
    .component('calSettingsDisplaySubheader', {
      bindings: {
        submit: '&',
        form: '<'
      },
      templateUrl: '/calendar/app/settings/subheader/display/settings-display-subheader.html'
    });
})();
