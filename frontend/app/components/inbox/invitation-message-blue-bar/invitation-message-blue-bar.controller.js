(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .controller('calInboxInvitationMessageBlueBarController', calInboxInvitationMessageBlueBarController);

  function calInboxInvitationMessageBlueBarController(
    $q,
    $log,
    calEventService,
    calendarHomeService,
    calEventUtils,
    notificationFactory,
    calOpenEventForm,
    session,
    INVITATION_MESSAGE_HEADERS,
    CAL_EVENT_METHOD
  ) {
    var self = this;

    self.$onInit = $onInit;
    self.CAL_EVENT_METHOD = CAL_EVENT_METHOD;
    self.changeParticipation = changeParticipation;
    self.acceptChanges = acceptChanges;
    self.isCurrentAttendeePartstat = isCurrentAttendeePartstat;
    self.openEvent = openEvent;

    function $onInit() {
      self.meeting = {
        method: self.message.headers[INVITATION_MESSAGE_HEADERS.METHOD] || CAL_EVENT_METHOD.REQUEST,
        uid: self.message.headers[INVITATION_MESSAGE_HEADERS.UID],
        recurrenceId: self.message.headers[INVITATION_MESSAGE_HEADERS.RECURRENCE_ID],
        sequence: self.message.headers[INVITATION_MESSAGE_HEADERS.SEQUENCE] || '0'
      };

      load();
    }

    function load() {
      calendarHomeService.getUserCalendarHomeId()
        .then(bindCalendarHomeId)
        .then(getEventByUID)
        .then(selectMasterEventOrException, handleNonExistentEvent)
        .then(assertEventInvolvesCurrentUser)
        .then(assertInvitationSequenceIsNotOutdated)
        .then(bindEventToController)
        .then(bindReplyAttendeeToController)
        .then(bindCanSuggestChanges)
        .then(fetchAdditionalData)
        .catch(handleErrorOrInvalidMeeting)
        .finally(function() {
          self.meeting.loaded = true;
        });
    }

    function bindCalendarHomeId(calendarId) {
      self.userCalendarHomeId = calendarId;
    }

    function bindCanSuggestChanges() {
      self.canSuggestChanges = calEventUtils.canSuggestChanges(self.event, session.user);
    }

    function changeParticipation(partstat) {
      var attendee = getUserAttendee(self.event);

      if (attendee.partstat === partstat) {
        return;
      }

      calEventService.changeParticipation(self.event.path, self.event, [attendee.email], partstat, self.event.etag)
        .then(selectMasterEventOrException)
        .then(bindEventToController)
        .then(notify('Participation updated!'), notify('Cannot change your participation to this event'));
    }

    function isCurrentAttendeePartstat(partstat) {
      return getUserAttendee(self.event).partstat === partstat;
    }

    function handleErrorOrInvalidMeeting(err) {
      if (err instanceof InvalidMeetingError) {
        self.meeting.invalid = true;
      } else {
        self.meeting.error = err.message || err;
      }

      $log.error(err);
    }

    function handleNonExistentEvent(err) {
      return $q.reject(err.status === 404 ? new InvalidMeetingError('Event not found.') : err);
    }

    function getUserAttendee(event) {
      return calEventUtils.getUserAttendee(event);
    }

    function getEventByUID() {
      return calEventService.getEventByUID(self.userCalendarHomeId, self.meeting.uid);
    }

    function selectMasterEventOrException(event) {
      if (self.meeting.recurrenceId) {
        event = event.getExceptionByRecurrenceId(self.meeting.recurrenceId);

        if (!event) {
          return $q.reject(new InvalidMeetingError('Occurrence ' + self.meeting.recurrenceId + ' not found.'));
        }
      }

      return event;
    }

    function assertEventInvolvesCurrentUser(event) {
      if (!getUserAttendee(event)) {
        return $q.reject(new InvalidMeetingError('Event does not involve current user.'));
      }

      return event;
    }

    function assertInvitationSequenceIsNotOutdated(event) {
      if (+self.meeting.sequence < +event.sequence) {
        return $q.reject(new InvalidMeetingError('Sequence is outdated (event.sequence = ' + event.sequence + ').'));
      }

      return event;
    }

    function bindEventToController(event) {
      self.event = event;
    }

    function notify(text) {
      return function() {
        notificationFactory.weakInfo('', text);
      };
    }

    function bindReplyAttendeeToController() {
      if (self.meeting.method === CAL_EVENT_METHOD.REPLY || self.meeting.method === CAL_EVENT_METHOD.COUNTER) {
        self.replyAttendee = self.event.getAttendeeByEmail(self.message.from.email);
      }
    }

    function fetchAdditionalData() {
      if (self.meeting.method === CAL_EVENT_METHOD.COUNTER) {
        return bindAttachedICS();
      }
    }

    function bindAttachedICS() {
      var icsFiles = self.message.attachments.filter(function(attachment) {
        return attachment.type === 'application/ics';
      });

      if (!icsFiles || !icsFiles.length) {
        return $q.when();
      }

      return icsFiles[0].getSignedDownloadUrl()
        .then(calEventService.getEventFromICSUrl)
        .then(function(shell) {
          self.additionalEvent = shell;
        });
    }

    function acceptChanges() {
      return calEventService.acceptChanges(self.event.path, self.event, self.additionalEvent, self.event.etag, ['start', 'end', 'allDay'])
        .then(notify('Event updated'))
        .then(function() {
          self.meeting.loaded = false;
          load();
        })
        .catch(notify('Event modification failed'));
    }

    function openEvent() {
      calOpenEventForm(self.userCalendarHomeId, self.event);
    }

    function InvalidMeetingError(message) {
      this.message = message;
      this.meeting = self.meeting;
    }
  }
})(angular);
