(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalResourceAvatarController', CalResourceAvatarController);

  function CalResourceAvatarController($log, esnAvatarUrlService, calResourceService, CAL_ICAL, CAL_RESOURCE) {
    var self = this;

    self.$onInit = $onInit;
    self.getDisplayName = getDisplayName;

    function $onInit() {
      self.resourceIcon = CAL_RESOURCE.DEFAULT_ICON;
      calResourceService.getResourceIcon(self.attendee.email.split('@')[0])
        .then(function(resourceIcon) {
          self.resourceIcon = resourceIcon;
        });
    }

    function getDisplayName() {
      return self.attendee.name || self.attendee.displayName;
    }
  }
})();
