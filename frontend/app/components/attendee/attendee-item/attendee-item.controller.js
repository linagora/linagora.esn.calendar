(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalAttendeeItemController', CalAttendeeItemController);

  function CalAttendeeItemController(CAL_FREEBUSY) {
    var self = this;

    self.removeAttendee = removeAttendee;
    self.CAL_FREEBUSY = CAL_FREEBUSY;

    function removeAttendee() {
      self.remove && self.remove({attendee: self.attendee});
    }
  }
})();
