(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalResourceListController', CalResourceListController);

  function CalResourceListController() {
    var self = this;

    self.resourceClickedCount = 0;
    self.selectResource = selectResource;
    self.deleteSelectedResources = deleteSelectedResources;

    function deleteSelectedResources() {
      self.resources = self.resources.filter(function(resource) { return !resource.clicked; });
      self.resourceClickedCount = 0;
    }

    function selectResource(resource) {
      resource.clicked = !resource.clicked;
      self.resourceClickedCount += resource.clicked ? 1 : -1;
    }
  }

})();
