(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalResourceItemController', CalResourceItemController);

  function CalResourceItemController(CAL_RESOURCE) {
    var self = this;

    self.$onInit = $onInit;
    self.$onChanges = $onChanges;

    function $onInit() {
      self.PARTSTAT_ICONS = CAL_RESOURCE.PARTSTAT_ICONS;
    }

    function $onChanges(resourcesChanges) {
      self.DELETED_ICONS = resourcesChanges.resource.currentValue.deleted ? CAL_RESOURCE.DELETED_ICON : '';
    }
  }

})();
