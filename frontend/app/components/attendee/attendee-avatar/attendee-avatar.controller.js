(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalAttendeeAvatarController', CalAttendeeAvatarController);

  function CalAttendeeAvatarController(esnAvatarUrlService, CAL_ICAL, CAL_RESOURCE) {
    var self = this;

    self.$onChanges = $onChanges;
    self.$onInit = $onInit;

    function $onChanges() {
      self.avatarUrl = getAvatarUrl();
    }

    function $onInit() {
      self.avatarResolver = {};
      self.avatarResolver[CAL_ICAL.cutype.resource] = getResourceAvatar;
      self.avatarResolver[CAL_ICAL.cutype.individual] = getUserAvatar;
    }

    function getAvatarUrl() {
      return (self.attendee.cutype && self.avatarResolver[self.attendee.cutype] ? self.avatarResolver[self.attendee.cutype] : getUserAvatar)();
    }

    function getResourceAvatar() {
      return CAL_RESOURCE.AVATAR_URL;
    }

    function getUserAvatar() {
      return esnAvatarUrlService.generateUrlByUserEmail(self.attendee.email);
    }
  }
})();
