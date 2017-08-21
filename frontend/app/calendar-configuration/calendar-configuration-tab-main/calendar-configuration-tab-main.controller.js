(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalendarConfigurationTabMainController', CalendarConfigurationTabMainController);

  function CalendarConfigurationTabMainController(
    $q,
    $state,
    calendarService,
    session,
    userUtils,
    CalCalendarRightsUtilsService,
    CAL_CALENDAR_PUBLIC_RIGHT,
    CAL_CALENDAR_SHARED_RIGHT,
    calUIAuthorizationService,
    calCalendarDeleteConfirmationModalService
  ) {
    var self = this;

    self.$onInit = $onInit;
    self.openDeleteConfirmationDialog = openDeleteConfirmationDialog;
    self.removeCalendar = removeCalendar;
    self.unsubscribe = unsubscribe;
    self.canDeleteCalendar = canDeleteCalendar;

    ///////////
    function $onInit() {
      self.publicRights = [
        {
          value: CAL_CALENDAR_PUBLIC_RIGHT.READ_WRITE,
          name: CAL_CALENDAR_PUBLIC_RIGHT.READ_WRITE_LABEL_LONG
        },
        {
          value: CAL_CALENDAR_PUBLIC_RIGHT.READ,
          name: CAL_CALENDAR_PUBLIC_RIGHT.READ_LABEL_LONG
        },
        {
          value: CAL_CALENDAR_PUBLIC_RIGHT.PRIVATE,
          name: CAL_CALENDAR_PUBLIC_RIGHT.PRIVATE_LABEL_LONG
        }
      ];

      !self.newCalendar && performExternalCalendarOperations(isExternalCalendar());

      self.canModifyPublicSelection = _canModifyPublicSelection();
    }

    function isExternalCalendar() {
      return self.calendar.isShared(session.user._id) || self.calendar.isSubscription();
    }

    function openDeleteConfirmationDialog() {
      calCalendarDeleteConfirmationModalService(self.calendar, removeCalendar);
    }

    function unsubscribe() {
      calendarService.unsubscribe(self.calendarHomeId, self.calendar).then(function() {
        $state.go('calendar.main');
      });
    }

    function removeCalendar() {
      calendarService.removeCalendar(self.calendarHomeId, self.calendar).then(function() {
        $state.go('calendar.main');
      });
    }

    function canDeleteCalendar() {
      return !self.newCalendar && calUIAuthorizationService.canDeleteCalendar(self.calendar, session.user._id);
    }

    function _canModifyPublicSelection() {
      return self.newCalendar || calUIAuthorizationService.canModifyPublicSelection(self.calendar, session.user._id);
    }

    function performExternalCalendarOperations(isExternalCalendar) {
      $q.when(isExternalCalendar)
        .then(function(isExternalCalendar) {
          if (!isExternalCalendar) {
            return $q.reject('Not a shared calendar');
          }
          var shareeRightRaw = self.calendar.rights.getShareeRight(session.user._id);

          self.shareeRight = shareeRightRaw && CalCalendarRightsUtilsService.delegationAsHumanReadable(shareeRightRaw);

          return self.calendar.getOwner();
        })
        .then(function(sharedCalendarOwner) {
          self.sharedCalendarOwner = sharedCalendarOwner;
          self.displayNameOfSharedCalendarOwner = userUtils.displayNameOf(sharedCalendarOwner);
        })
        .catch(angular.noop);
    }
  }
})();
