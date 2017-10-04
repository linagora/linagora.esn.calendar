(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalSettingsResourcesCreateController', CalSettingsResourcesCreateController);

  function CalSettingsResourcesCreateController($state, esnResourceAPIClient, asyncAction, CAL_RESOURCE) {
    var self = this;

    self.submit = submit;

    function submit() {
      return asyncAction({
        progressing: 'Creating resource...',
        success: 'Resource has been created',
        failure: 'Failed to create resource'
      }, function() {
        self.resource.type = CAL_RESOURCE.type;

        return esnResourceAPIClient.create(self.resource).finally(function() {
          $state.go('calendar.settings.resources', null, { reload: true });
        });
      });
    }
  }
})();
