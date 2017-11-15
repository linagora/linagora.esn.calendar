(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalAttendeeAvatarController', CalAttendeeAvatarController);

  function CalAttendeeAvatarController(esnAvatarUrlService) {
    var self = this;

    self.$onChanges = $onChanges;
    self.getDisplayName = getDisplayName;

    function $onChanges() {
      self.avatarUrl = getUserAvatar();
    }

    function getUserAvatar() {
      return esnAvatarUrlService.generateUrlByUserEmail(self.attendee.email);
    }

    function getDisplayName() {
      return self.attendee.name || self.attendee.displayName;
    }
  }
})();
