(function() {
  'use strict';

  angular.module('esn.calendar')
    .factory('calEventUtils', calEventUtils);

  function calEventUtils(
    _,
    escapeHtmlUtils,
    session,
    esnI18nService,
    CAL_DEFAULT_EVENT_COLOR,
    CAL_SIGNIFICANT_CHANGE_KEYS,
    CAL_EVENT_FORM
  ) {
    var editedEvent = null;
    var newAttendees = [];
    var newResources = [];

    var service = {
      editedEvent: editedEvent,
      isNew: isNew,
      isInvolvedInATask: isInvolvedInATask,
      isOrganizer: isOrganizer,
      hasSignificantChange: hasSignificantChange,
      hasAttendees: hasAttendees,
      hasAnyChange: hasAnyChange,
      getEditedEvent: getEditedEvent,
      setEditedEvent: setEditedEvent,
      getNewAttendees: getNewAttendees,
      getNewResources: getNewResources,
      setNewAttendees: setNewAttendees,
      setNewResources: setNewResources,
      setBackgroundColor: setBackgroundColor,
      resetStoredEvents: resetStoredEvents,
      applyReply: applyReply,
      getUserAttendee: getUserAttendee,
      getEventTitle: getEventTitle
    };

    return service;

    ////////////

    /**
     * Return true or false either the event is new (not in caldav yet) or not.
     * We are using etag which is filled by the caldav server on creation
     * @param  {CalendarShell}  event the event to checkbox
     * @return {Boolean}        true if event is not yet on the server, false otherwise
     */
    function isNew(event) {
      return angular.isUndefined(event.etag);
    }

    /**
     * Return true or false either the event is involved in a graceperiod task
     * @param  {CalendarShell}  event the event to checkbox
     * @return {Boolean}
     */
    function isInvolvedInATask(event) {
      return !angular.isUndefined(event.gracePeriodTaskId);
    }

    function isOrganizer(event, user) {
      var organizerMail = event && event.organizer && (event.organizer.email || event.organizer.emails[0]);
      user = user || session.user;

      return !organizerMail || _.contains(organizerMail, user.emails);
    }

    function hasSignificantChange(oldEvent, newEvent) {
      return !oldEvent.equals(newEvent, CAL_SIGNIFICANT_CHANGE_KEYS);
    }

    function hasAnyChange(oldEvent, newEvent) {
      return !oldEvent.equals(newEvent);
    }

    function hasAttendees(event) {
      return angular.isArray(event.attendees) && event.attendees.length > 0;
    }

    function getNewAttendees() {
      return newAttendees;
    }

    function setNewAttendees(attendees) {
      newAttendees = angular.copy(attendees);
    }

    function getNewResources() {
      return newResources;
    }

    function setNewResources(resources) {
      newResources = angular.copy(resources);
    }

    function getEditedEvent() {
      return editedEvent;
    }

    function setEditedEvent(event) {
      editedEvent = event;
    }

    function resetStoredEvents() {
      editedEvent = {};
      newAttendees = [];
      newResources = [];
    }

    function applyReply(originalEvent, reply) {
      reply.vcalendar.getFirstSubcomponent('vevent').getAllProperties('attendee').forEach(function(replyAttendee) {
        originalEvent.vcalendar.getFirstSubcomponent('vevent').getAllProperties('attendee').forEach(function(attendee) {
          if (replyAttendee.getFirstValue() === attendee.getFirstValue()) {
            attendee.setParameter('partstat', replyAttendee.getParameter('partstat'));
          }
        });
      });

      return originalEvent;
    }

    function setBackgroundColor(event, calendars) {
      event.backgroundColor = (_.find(calendars, {id: event.calendarId}) || {color: CAL_DEFAULT_EVENT_COLOR}).color;

      return event;
    }

    function getUserAttendee(event) {
      return _.find(event.attendees, function(attendee) {
        return attendee.email in session.user.emailMap;
      });
    }

    function getEventTitle(event) {
      var title = event.title ? event.title.trim() : CAL_EVENT_FORM.title.empty;

      return title.trim() === CAL_EVENT_FORM.title.empty ? esnI18nService.translate(CAL_EVENT_FORM.title.default) : title;
    }
  }

})();
