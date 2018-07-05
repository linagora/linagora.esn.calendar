(function() {
  'use strict';

  angular.module('esn.calendar')
    .service('calUIAuthorizationService', calUIAuthorizationService);

  function calUIAuthorizationService(
    calEventUtils,
    calDefaultValue,
    CAL_CALENDAR_PUBLIC_RIGHT,
    CAL_CALENDAR_SHARED_RIGHT
  ) {

    return {
      canAccessEventDetails: canAccessEventDetails,
      canDeleteCalendar: canDeleteCalendar,
      canExportCalendarIcs: canExportCalendarIcs,
      canModifyCalendarProperties: canModifyCalendarProperties,
      canModifyEvent: canModifyEvent,
      canModifyEventAttendees: canModifyEventAttendees,
      canModifyEventRecurrence: canModifyEventRecurrence,
      canModifyPublicSelection: canModifyPublicSelection,
      canShowDelegationTab: canShowDelegationTab
    };

    ////////////

    function canAccessEventDetails(calendar, event, userId) {
      return !!calendar && !!event && (_isOrganizerAndOwner(calendar, event, userId) || (event.isPublic() && calendar.isReadable(userId)));
    }

    function canDeleteCalendar(calendar, userId) {
      return !!calendar && (calendar.id !== calDefaultValue.get('calendarId')) && canModifyCalendarProperties(calendar, userId);
    }

    function canExportCalendarIcs(calendar, userId) {
      return !!calendar && calendar.isReadable(userId);
    }

    function canModifyEvent(calendar, event, userId) {
      if (!!event && calEventUtils.isNew(event)) {
        return true;
      }

      return _canModifyEvent(calendar, event, userId);
    }

    function canModifyEventAttendees(calendar, event, userId) {
      //Sharees with Write permissions cannot modify attendee list according to the RFC
      //https://github.com/apple/ccs-calendarserver/blob/master/doc/Extensions/caldav-sharing.txt#L847
      return !!event && _isOrganizerAndOwner(calendar, event, userId);
    }

    function canModifyEventRecurrence(calendar, event, userId) {
      return _canModifyEvent(calendar, event, userId) && !!event && !event.isInstance();
    }

    function canModifyPublicSelection(calendar, userId) {
      return _isAdminForCalendar(calendar, userId);
    }

    function canModifyCalendarProperties(calendar, userId) {
      // the owner of a Subscription is not the same the current user, so we need to check for calendar.isSubscription()
      // to allow the user to unsubscribe from a public calendar
      return !!calendar && (calendar.isOwner(userId) || calendar.isShared(userId) || calendar.isSubscription());
    }

    function canShowDelegationTab(calendar, userId) {
      return _isAdminForCalendar(calendar, userId);
    }

    function _isAdminForCalendar(calendar, userId) {
      return !!calendar && calendar.isAdmin(userId) && !calendar.isSubscription();
    }

    function _isOrganizerAndOwner(calendar, event, userId) {
      return calendar.isOwner(userId) && calEventUtils.isOrganizer(event);
    }

    function _canModifyEvent(calendar, event, userId) {
      var publicRight, sharedRight, isOrganizerAndOwner;

      if (!!calendar && !!event) {
        sharedRight = calendar.rights.getShareeRight(userId);
        publicRight = calendar.rights.getPublicRight();
        isOrganizerAndOwner = _isOrganizerAndOwner(calendar, event, userId);

        return isOrganizerAndOwner ||
          sharedRight === CAL_CALENDAR_SHARED_RIGHT.SHAREE_READ_WRITE ||
          sharedRight === CAL_CALENDAR_SHARED_RIGHT.SHAREE_ADMIN ||
          (!isOrganizerAndOwner && publicRight === CAL_CALENDAR_PUBLIC_RIGHT.READ_WRITE);
      }

      return false;
    }
  }
})();
