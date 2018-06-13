(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalAttendeeItemController', CalAttendeeItemController);

  function CalAttendeeItemController(CAL_FREEBUSY) {
    var self = this;

    self.getDisplayName = getDisplayName;
    self.removeAttendee = removeAttendee;
    self.CAL_FREEBUSY = CAL_FREEBUSY;

    function getDisplayName() {
      return self.attendee.name || self.attendee.displayName;
    }

    function removeAttendee() {
      self.remove && self.remove({attendee: self.attendee});
    }
  }
})();
