(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalAttendeeAvatarController', CalAttendeeAvatarController);

  function CalAttendeeAvatarController(esnAvatarUrlService) {
    var self = this;

    self.$onChanges = $onChanges;

    function $onChanges() {
      self.avatarUrl = esnAvatarUrlService.generateUrlByUserEmail(self.attendee.email);
    }
  }
})();
