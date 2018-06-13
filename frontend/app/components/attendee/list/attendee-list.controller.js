(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalAttendeeListController', CalAttendeeListController);

  function CalAttendeeListController(_) {
    var self = this;

    self.removeAttendee = removeAttendee;
    self.$onInit = $onInit;
    self.$onChanges = $onChanges;

    function $onInit() {
      _splitAttendees();
    }

    function $onChanges() {
      _splitAttendees();
    }

    function _splitAttendees() {
      self.organizerAttendee = getOrganizer();
      self.attendeesToDisplay = getAttendeesToDisplay();
    }

    function getOrganizer() {
      return _.find(self.attendees, isOrganizer);
    }

    function getAttendeesToDisplay() {
      return self.attendees.filter(function(attendee) {
        return !isOrganizer(attendee);
      });
    }

    function isOrganizer(attendee) {
      return attendee && attendee.email && self.organizer && self.organizer.email && self.organizer.email === attendee.email;
    }

    function removeAttendee(attendee) {
      self.onAttendeeRemoved && self.onAttendeeRemoved({attendee: attendee});
    }
  }

})();
