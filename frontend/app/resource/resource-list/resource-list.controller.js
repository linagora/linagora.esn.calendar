(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalResourceListController', CalResourceListController);

  function CalResourceListController() {
    var self = this;

    self.resourceSelectedCount = 0;
    self.selectResource = selectResource;
    self.deleteSelectedResources = deleteSelectedResources;

    function deleteSelectedResources() {
      self.resources = self.resources.filter(function(resource) { return !resource.selected; });
      self.resourceSelectedCount = 0;
    }

    function selectResource(resource) {
      resource.selected = !resource.selected;
      self.resourceSelectedCount += resource.selected ? 1 : -1;
    }
  }

})();
