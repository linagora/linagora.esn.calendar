(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalResourceItemController', CalResourceItemController);

  function CalResourceItemController(CAL_RESOURCE) {
    var self = this;

    self.PARTSTAT_ICONS = CAL_RESOURCE.PARTSTAT_ICONS;
  }

})();
