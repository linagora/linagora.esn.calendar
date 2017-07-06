(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalSettingsCalendarsItemController', CalSettingsCalendarsItemController);

  function CalSettingsCalendarsItemController() {
    var self = this;

    self.remove = remove;

    function remove() {
      self.onRemove(self.calendar);
      }
  }
})();
