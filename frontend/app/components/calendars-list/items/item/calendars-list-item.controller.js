(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalendarsListItemController', CalendarsListItemController);

  function CalendarsListItemController($log, CAL_RESOURCE, calResourceService, userUtils) {
    var self = this;

    self.$onInit = $onInit;

    function $onInit() {
      if (self.showDetails && !self.calendar.isResource()) {
        getOwnerDisplayName().then(function(ownerDisplayName) {
          self.ownerDisplayName = ownerDisplayName;
        });
      }

      if (self.calendar.isResource() && !self.resourceIcon) {
        self.resourceIcon = CAL_RESOURCE.DEFAULT_ICON;

        calResourceService.getResourceIcon(self.calendar.source.calendarHomeId)
          .then(function(resourceIcon) {
            self.resourceIcon = resourceIcon;
          })
          .catch(function(err) {
            $log.error(err);
          });
      }
    }

    function getOwnerDisplayName() {
      return self.calendar.getOwner().then(userUtils.displayNameOf);
    }
  }
})();
