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
      getUserAttendee: getUserAttendee,
      getEventTitle: getEventTitle,
      canSuggestChanges: canSuggestChanges
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

      return !organizerMail || _.contains(user.emails, organizerMail);
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

    function setBackgroundColor(event, calendars) {
      event.backgroundColor = (_.find(calendars, {id: event.calendarId}) || {color: CAL_DEFAULT_EVENT_COLOR}).color;

      return event;
    }

    function getUserAttendee(event, user) {
      user = user || session.user;

      return _.find(event.attendees, function(attendee) {
        return _.contains(user.emails, attendee.email);
      });
    }

    function getEventTitle(event) {
      var title = event.title ? event.title.trim() : CAL_EVENT_FORM.title.empty;

      return title.trim() === CAL_EVENT_FORM.title.empty ? esnI18nService.translate(CAL_EVENT_FORM.title.default) : title;
    }

    function canSuggestChanges(event, user) {
      return !!(!event.isRecurring() && !isOrganizer(event, user) && getUserAttendee(event, user));
    }
  }

})();
