(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalSettingsCalendarsController', CalSettingsCalendarsController);

  function CalSettingsCalendarsController($log, _, session, calendarService, calCalendarDeleteConfirmationModalService, userAndExternalCalendars) {
    var self = this;

    self.$onInit = $onInit;
    self.remove = remove;

    function $onInit() {
      listCalendars();
    }

    function listCalendars() {
      return calendarService.listPersonalAndAcceptedDelegationCalendars(session.user._id).then(function(calendars) {
        self.calendars = calendars;
        refreshCalendarsList();
      });
    }

    function remove(calendar) {
      _openDeleteConfirmationDialog(calendar);
    }

    function _openDeleteConfirmationDialog(calendar) {
      function removeCalendar() {
        calendarService.removeCalendar(calendar.calendarHomeId, calendar).then(function() {
          handleCalendarRemove(calendar);
        }, function(err) {
          $log.error('Can not delete calendar', calendar, err);
        });
      }

      self.modal = calCalendarDeleteConfirmationModalService(calendar, removeCalendar);
    }

    function handleCalendarRemove(calendar) {
      _.remove(self.calendars, { uniqueId: calendar.uniqueId });
      refreshCalendarsList();
    }

    function refreshCalendarsList() {
      var calendars = userAndExternalCalendars(self.calendars);

      self.userCalendars = calendars.userCalendars;
      self.sharedCalendars = calendars.sharedCalendars;
      self.publicCalendars = calendars.publicCalendars;
    }
  }
})();
