(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalAttendeeListController', CalAttendeeListController);

  function CalAttendeeListController($scope, CAL_EVENTS) {
    var self = this;

    self.attendeesPerPartstat = {};
    self.attendeeSelectedCount = 0;
    self.isOrganizer = isOrganizer;
    self.selectAttendee = selectAttendee;
    self.deleteSelectedAttendees = deleteSelectedAttendees;
    self.$onInit = $onInit;

    function $onInit() {
      updateAttendeeStats();
      $scope.$on(CAL_EVENTS.EVENT_ATTENDEES_UPDATE, function() {
        updateAttendeeStats();
      });
    }

    function isOrganizer(attendee) {
      return attendee && attendee.email && self.organizer && self.organizer.email && self.organizer.email === attendee.email;
    }

    function deleteSelectedAttendees() {
      var removed = [];
      var notselected = [];

      self.attendees.forEach(function(attendee) {
        attendee.selected ? removed.push(attendee) : notselected.push(attendee);
      });

      self.attendees = notselected;
      self.attendeeSelectedCount = 0;
      self.onAttendeesRemoved && self.onAttendeesRemoved({removed: removed});

      updateAttendeeStats();
    }

    function selectAttendee(attendee) {
      if (self.organizer.email !== attendee.email) {
        attendee.selected = !attendee.selected;
        self.attendeeSelectedCount += attendee.selected ? 1 : -1;
      }
    }

    function updateAttendeeStats() {
      var partstatMap = self.attendeesPerPartstat = {
        'NEEDS-ACTION': 0,
        ACCEPTED: 0,
        TENTATIVE: 0,
        DECLINED: 0,
        OTHER: 0
      };

      if (!self.attendees || !self.attendees.length) {
        return;
      }

      self.attendees.forEach(function(attendee) {
        partstatMap[attendee.partstat in partstatMap ? attendee.partstat : 'OTHER']++;
      });
    }
  }

})();
