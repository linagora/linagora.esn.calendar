(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .controller('calInboxResourceManagementBlueBarController', calInboxResourceManagementBlueBarController);

  function calInboxResourceManagementBlueBarController(
    _,
    $q,
    $log,
    calEventService,
    calResourceService,
    esnResourceAPIClient,
    esnResourceService,
    notificationFactory,
    CAL_ICAL,
    INVITATION_MESSAGE_HEADERS,
    X_OPENPAAS_CAL_HEADERS
  ) {
    var defaultParticipationButtonClass = 'btn-default';
    var self = this;

    self.$onInit = $onInit;
    self.acceptResourceReservation = acceptResourceReservation;
    self.declineResourceReservation = declineResourceReservation;
    self.getParticipationButtonClass = getParticipationButtonClass;

    function $onInit() {
      self.meeting = {
        method: self.message.headers[INVITATION_MESSAGE_HEADERS.METHOD],
        eventPath: getEventPath()
      };

      getEvent()
        .then(bindEventToController, handleUnknownEvent)
        .then(loadResource)
        .then(bindResourceToController)
        .catch(handleError)
        .finally(function() {
          self.meeting.loaded = true;
        });
    }

    function getEventPath() {
      var eventHeader = _.findKey(self.message.headers, function(value, key) {
        return key.toLowerCase() === X_OPENPAAS_CAL_HEADERS.EVENT_PATH.toLowerCase();
      });

      return self.message.headers[eventHeader];
    }

    function acceptResourceReservation() {
      if (getResourceParticipation().partstat === CAL_ICAL.partstat.accepted) {
        return;
      }

      return calResourceService.acceptResourceReservation(self.resource._id, self.event.id)
        .then(notify('Resource reservation confirmed!'), notify('Cannot change the resource reservation'));
    }

    function declineResourceReservation() {
      if (getResourceParticipation().partstat === CAL_ICAL.partstat.declined) {
        return;
      }

      return calResourceService.declineResourceReservation(self.resource._id, self.event.id)
        .then(notify('Resource reservation declined!'), notify('Cannot change the resource reservation'));
    }

    function handleUnknownEvent(err) {
      return $q.reject(err.status === 404 ? new InvalidEventError('Event not found.') : err);
    }

    function handleError(err) {
      if (err instanceof InvalidEventError) {
        self.meeting.invalid = true;
      } else {
        self.meeting.error = err.message || err;
      }

      $log.error(err);
    }

    function getEvent() {
      return calEventService.getEvent(self.meeting.eventPath);
    }

    function getParticipationButtonClass(cls, partstat) {
      return getResourceParticipation().partstat === partstat ? cls : defaultParticipationButtonClass;
    }

    function getResourceParticipation() {
      return _.find(self.event.attendees, function(attendee) {
        return attendee.email === esnResourceService.getEmail(self.resource);
      }) || {};
    }

    function bindEventToController(event) {
      self.event = event;
    }

    function loadResource() {
      return esnResourceAPIClient.get(self.event.calendarHomeId).then(function(response) {
        return response.data;
      });
    }

    function bindResourceToController(resource) {
      self.resource = resource;
    }

    function notify(text) {
      return function() {
        notificationFactory.weakInfo('', text);
      };
    }

    function InvalidEventError(message) {
      this.message = message;
      this.meeting = self.meeting;
    }
  }
})(angular);
