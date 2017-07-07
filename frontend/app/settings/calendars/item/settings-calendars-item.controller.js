(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalSettingsCalendarsItemController', CalSettingsCalendarsItemController);

  function CalSettingsCalendarsItemController(session, calUIAuthorizationService) {
    var self = this;

    self.canDeleteCalendar = canDeleteCalendar;
    self.remove = remove;

    function canDeleteCalendar() {
      return calUIAuthorizationService.canDeleteCalendar(self.calendar, session.user._id);
    }

    function remove() {
      self.onRemove(self.calendar);
    }
  }
})();
