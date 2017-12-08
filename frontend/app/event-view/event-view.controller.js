(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalEventViewController', CalEventViewController);

  function CalEventViewController(calAttendeeService) {
    var self = this;

    self.$onInit = $onInit;

    function $onInit() {
      self.attendees = calAttendeeService.splitAttendeesFromType(self.event.attendees);
    }
  }
})();
