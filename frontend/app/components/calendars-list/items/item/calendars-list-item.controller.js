(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalendarsListItemController', CalendarsListItemController);

  function CalendarsListItemController($log, CAL_RESOURCE, calResourceService, userUtils) {
    var self = this;

    self.$onInit = $onInit;

    function $onInit() {
      initDetails();

      self.calendar.isResource() && initResourceIcon();
    }

    function initDetails() {
      if (!self.showDetails) {
        return;
      }

      return getOwnerDisplayName().then(function(ownerDisplayName) {
        self.details = ownerDisplayName;
      });
    }

    function initResourceIcon() {
      self.resourceIcon = CAL_RESOURCE.DEFAULT_ICON;

      return calResourceService.getResourceIcon(self.calendar.source.calendarHomeId)
        .then(function(resourceIcon) {
          self.resourceIcon = resourceIcon;
        })
        .catch(function(err) {
          $log.error(err);
        });
    }

    function getOwnerDisplayName() {
      return self.calendar.getOwner().then(function(owner) {
        if (self.calendar.isResource()) {
          return owner.name;
        }

        return userUtils.displayNameOf(owner);
      });
    }
  }
})(angular);
