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
    CAL_CALENDAR_PUBLIC_RIGHT,
    CAL_CALENDAR_SHARED_RIGHT,
    calUIAuthorizationService,
    calCalendarDeleteConfirmationModalService
  ) {
    var self = this;
    var rightLabels = {};

    self.$onInit = $onInit;
    self.openDeleteConfirmationDialog = openDeleteConfirmationDialog;
    self.removeCalendar = removeCalendar;
    self.unsubscribe = unsubscribe;
    self.canDeleteCalendar = canDeleteCalendar;

    ///////////
    function $onInit() {
      self.publicRights = [
        {
          value: CAL_CALENDAR_PUBLIC_RIGHT.READ,
          name: 'Read'
        },
        {
          value: CAL_CALENDAR_PUBLIC_RIGHT.READ_WRITE,
          name: 'Write'
        }, {
          value: CAL_CALENDAR_PUBLIC_RIGHT.FREE_BUSY,
          name: 'Private'
        }, {
          value: CAL_CALENDAR_PUBLIC_RIGHT.NONE,
          name: 'None'
        }
      ];

      rightLabels[CAL_CALENDAR_SHARED_RIGHT.SHAREE_READ] = 'Read only';
      rightLabels[CAL_CALENDAR_SHARED_RIGHT.SHAREE_READ_WRITE] = 'Read and Write';
      rightLabels[CAL_CALENDAR_SHARED_RIGHT.SHAREE_ADMIN] = 'Administration';
      rightLabels[CAL_CALENDAR_SHARED_RIGHT.SHAREE_FREE_BUSY] = 'Free/Busy';

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

          self.shareeRight = rightLabels[shareeRightRaw];

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
