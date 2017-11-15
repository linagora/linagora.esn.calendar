(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalendarsListItemController', CalendarsListItemController);

  function CalendarsListItemController($log, CAL_RESOURCE, calResourceService, userUtils) {
    var self = this;

    self.$onInit = $onInit;

    function $onInit() {
      self.calendar.isResource() ? initResource() : initCalendar();
    }

    function initCalendar() {
      if (!self.showDetails) {
        return;
      }

      return getOwnerDisplayName().then(function(ownerDisplayName) {
        self.details = ownerDisplayName;
      });
    }

    function initResource() {
      if (self.showDetails) {
        self.details = self.calendar.source.description;
      }

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
      return self.calendar.getOwner().then(userUtils.displayNameOf);
    }
  }
})(angular);
