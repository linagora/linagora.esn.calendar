(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalSettingsResourcesCreateController', CalSettingsResourcesCreateController);

  function CalSettingsResourcesCreateController($state, _, esnResourceAPIClient, asyncAction, CAL_RESOURCE) {
    var self = this;

    self.submit = submit;
    self.resourceAdministrators = [];

    function submit() {
      return asyncAction({
        progressing: 'Creating resource...',
        success: 'Resource has been created',
        failure: 'Failed to create resource'
      }, function() {
        self.resource.type = CAL_RESOURCE.type;
        self.resource.administrators = _.map(self.resourceAdministrators, function(admin) {
          return {
            id: admin._id,
            objectType: 'user'
          };
        });

        return esnResourceAPIClient.create(self.resource).finally(function() {
          $state.go('calendar.settings.resources', null, { reload: true });
        });
      });
    }
  }
})();
