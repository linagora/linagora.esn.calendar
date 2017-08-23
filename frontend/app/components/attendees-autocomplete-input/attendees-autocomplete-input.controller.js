(function() {
  'use strict';

  angular.module('esn.calendar')
         .controller('calAttendeesAutocompleteInputController', calAttendeesAutocompleteInputController);

  function calAttendeesAutocompleteInputController(calendarAttendeeService, naturalService, session, CAL_AUTOCOMPLETE_MAX_RESULTS) {
    var self = this;

    self.mutableAttendees = self.mutableAttendees || [];
    self.originalAttendees = self.originalAttendees || [];
    self.onAddingAttendee = onAddingAttendee;
    self.getInvitableAttendees = getInvitableAttendees;

    ////////////

    function onAddingAttendee(attendee) {
      if (!attendee.id) {
        attendee.id = attendee.displayName;
        attendee.email = attendee.displayName;
      }

      return !_isDuplicateAttendee(attendee, _getAddedAttendeesEmails());
    }

    function getInvitableAttendees(query) {
      self.query = query;

      return calendarAttendeeService.getAttendeeCandidates(query, CAL_AUTOCOMPLETE_MAX_RESULTS * 2).then(function(attendeeCandidates) {
        attendeeCandidates = _fillNonDuplicateAttendees(attendeeCandidates);
        attendeeCandidates.sort(function(a, b) {
          return naturalService.naturalSort(a.displayName, b.displayName);
        });

        return attendeeCandidates.slice(0, CAL_AUTOCOMPLETE_MAX_RESULTS);
      });
    }

    function _fillNonDuplicateAttendees(attendees) {
      var addedAttendeesEmails = _getAddedAttendeesEmails();

      return attendees.filter(function(attendee) {
        return !_isDuplicateAttendee(attendee, addedAttendeesEmails);
      });
    }

    function _getAddedAttendeesEmails() {
      var addedAttendees = self.mutableAttendees.concat(self.originalAttendees);
      var addedAttendeesEmails = [];

      addedAttendees.forEach(function(attendee) {
        if (attendee.emails) {
          attendee.emails.forEach(function(email) {
            addedAttendeesEmails.push(email);
          });
        } else {
          addedAttendeesEmails.push(attendee.email);
        }
      });

      return addedAttendeesEmails;
    }

    function _isDuplicateAttendee(attendee, addedAttendeesEmails) {
      return (attendee.email in session.user.emailMap) || addedAttendeesEmails.indexOf(attendee.email) > -1;
    }
  }

})();
