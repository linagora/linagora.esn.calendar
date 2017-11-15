(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalResourceAvatarController', CalResourceAvatarController);

  function CalResourceAvatarController($log, esnAvatarUrlService, calResourceService, CAL_ICAL, CAL_RESOURCE) {
    var self = this;

    self.$onChanges = $onChanges;
    self.getDisplayName = getDisplayName;

    function $onChanges() {
      console.log(self.attendee);

      self.resourceIcon = CAL_RESOURCE.DEFAULT_ICON;
      /*
      calResourceService.getResourceIcon(self.calendar.source.calendarHomeId)
        .then(function(resourceIcon) {
          self.resourceIcon = resourceIcon;
        })
        .catch(function(err) {
          $log.error(err);
      });
      */
    }

    function getDisplayName() {
      return self.attendee.name || self.attendee.displayName;
    }
  }
})();
