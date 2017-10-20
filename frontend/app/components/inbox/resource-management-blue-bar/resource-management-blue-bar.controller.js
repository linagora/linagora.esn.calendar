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
    notificationFactory,
    INVITATION_MESSAGE_HEADERS,
    X_OPENPAAS_CAL_HEADERS
  ) {
    var self = this;

    self.$onInit = $onInit;
    self.acceptResourceReservation = acceptResourceReservation;
    self.declineResourceReservation = declineResourceReservation;

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
      return calResourceService.acceptResourceReservation(self.resource._id, self.event.id)
        .then(notify('Resource reservation confirmed!'), notify('Cannot change the resource reservation'));
    }

    function declineResourceReservation() {
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
