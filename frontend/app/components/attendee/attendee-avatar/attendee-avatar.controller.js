(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalAttendeeAvatarController', CalAttendeeAvatarController);

  function CalAttendeeAvatarController(esnAvatarUrlService) {
    var self = this;

    self.$onInit = $onInit;

    function $onInit() {
      self.avatarUrl = esnAvatarUrlService.generateUrlByUserEmail(self.attendee.email);
    }
  }
})();
