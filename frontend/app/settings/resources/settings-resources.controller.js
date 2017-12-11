(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalSettingsResourcesController', CalSettingsResourcesController);

  function CalSettingsResourcesController(CAL_RESOURCE) {
    var self = this;

    self.type = CAL_RESOURCE.type;
  }
})();
