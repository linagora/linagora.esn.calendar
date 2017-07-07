(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalSettingsCalendarsItemController', CalSettingsCalendarsItemController);

  function CalSettingsCalendarsItemController(session, userUtils, calUIAuthorizationService) {
    var self = this;

    self.canDeleteCalendar = canDeleteCalendar;
    self.remove = remove;
    self.$onInit = $onInit;

    function $onInit() {
      if (self.displayOwner) {
        getOwnerDisplayName().then(function(ownerDisplayName) {
          self.ownerDisplayName = ownerDisplayName;
        });
      }
    }

    function canDeleteCalendar() {
      return calUIAuthorizationService.canDeleteCalendar(self.calendar, session.user._id);
    }

    function getOwnerDisplayName() {
      return self.calendar.getOwner().then(userUtils.displayNameOf);
    }

    function remove() {
      self.onRemove(self.calendar);
    }
  }
})();
