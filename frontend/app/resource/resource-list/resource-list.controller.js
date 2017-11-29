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
      var removed = [];
      var notselected = [];

      self.resources.forEach(function(resource) {
        resource.selected ? removed.push(resource) : notselected.push(resource);
      });

      self.resources = notselected;
      self.resourceSelectedCount = 0;
      self.onResourcesRemoved && self.onResourcesRemoved({removed: removed});
    }

    function selectResource(resource) {
      resource.selected = !resource.selected;
      self.resourceSelectedCount += resource.selected ? 1 : -1;
    }
  }

})();
