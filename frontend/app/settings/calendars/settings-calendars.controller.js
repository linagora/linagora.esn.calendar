(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalSettingsCalendarsController', CalSettingsCalendarsController);

  function CalSettingsCalendarsController($log, $modal, _, session, calendarService, userAndExternalCalendars) {
    var self = this;

    self.$onInit = $onInit;
    self.remove = remove;

    function $onInit() {
      listCalendars();
    }

    function listCalendars() {
      return calendarService.listCalendars(session.user._id).then(function(calendars) {
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

      self.modal = $modal({
        templateUrl: '/calendar/app/calendar-configuration/calendar-configuration-delete-confirmation/calendar-configuration-delete-confirmation.html',
        controller: function($scope) {
          $scope.calendarName = calendar.name;
          $scope.delete = removeCalendar;
        },
        backdrop: 'static',
        placement: 'center'
      });
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
