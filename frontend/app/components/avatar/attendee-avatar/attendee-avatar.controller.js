(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalAttendeeAvatarController', CalAttendeeAvatarController);

  function CalAttendeeAvatarController(esnAvatarUrlService, CAL_FREEBUSY) {
    var self = this;

    self.$onInit = $onInit;
    self.$onChanges = $onChanges;
    self.getDisplayName = getDisplayName;

    function $onInit() {
      self.freeBusy = self.attendee.freeBusy || CAL_FREEBUSY.UNKNOWN;
    }

    function $onChanges() {
      self.avatarUrl = getUserAvatar();
    }

    function getUserAvatar() {
      return esnAvatarUrlService.generateUrl(self.attendee.email);
    }

    function getDisplayName() {
      return self.attendee.name || self.attendee.displayName;
    }
  }
})();
