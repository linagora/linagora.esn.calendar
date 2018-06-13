(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalAttendeeListController', CalAttendeeListController);

  function CalAttendeeListController(_, CAL_ATTENDEE_LIST_LIMIT) {
    var self = this;

    self.removeAttendee = removeAttendee;
    self.$onInit = $onInit;
    self.$onChanges = $onChanges;
    self.showAll = showAll;
    self.showToggle = showToggle;

    function $onInit() {
      self.CAL_ATTENDEE_LIST_LIMIT = CAL_ATTENDEE_LIST_LIMIT;
      self.limit = CAL_ATTENDEE_LIST_LIMIT - 1;
      _splitAttendees();
    }

    function $onChanges() {
      _splitAttendees();
    }

    function showToggle() {
      return !self.showAllAttendees && self.attendees.length > CAL_ATTENDEE_LIST_LIMIT;
    }

    function showAll() {
      self.showAllAttendees = true;
      self.limit = self.attendees.length;
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
