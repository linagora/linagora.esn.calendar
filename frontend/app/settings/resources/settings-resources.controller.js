(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalSettingsResourcesController', CalSettingsResourcesController);

  function CalSettingsResourcesController($modal, CAL_RESOURCE) {
    var self = this;

    self.type = CAL_RESOURCE.type;
    self.openCreateModal = openCreateModal;

    function openCreateModal() {
      return $modal({
        templateUrl: '/calendar/app/settings/resources/create/settings-resources-create-modal.html',
        controller: 'CalSettingsResourcesCreateController',
        controllerAs: 'ctrl',
        backdrop: 'static',
        placement: 'center'
      });
    }
  }
})();
