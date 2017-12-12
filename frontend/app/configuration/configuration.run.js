(function() {
  'use strict';

  angular.module('esn.calendar')
    .run(runBlock);

  function runBlock(calConfigurationService) {
    calConfigurationService.init();
  }
})();
