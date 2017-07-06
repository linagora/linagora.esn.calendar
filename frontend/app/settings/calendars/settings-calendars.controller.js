(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalSettingsCalendarsController', CalSettingsCalendarsController);

  function CalSettingsCalendarsController($log, $modal, _, session, calendarService) {
    var self = this;

    self.$onInit = $onInit;
    self.remove = remove;

    function $onInit() {
      listCalendars();
    }

    function listCalendars() {
      return calendarService.listCalendars(session.user._id).then(function(calendars) {
        self.calendars = calendars;
      });
    }

    function remove(calendar) {
      _openDeleteConfirmationDialog(calendar);
    }

    function _openDeleteConfirmationDialog(calendar) {
      function removeCalendar() {
        calendarService.removeCalendar(calendar.calendarHomeId, calendar).then(function() {
          _remove(calendar);
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

    function _remove(calendar) {
      _.remove(self.calendars, function(_calendar) {
        return _calendar.uniqueId === calendar.uniqueId;
      });
    }
  }
})();
