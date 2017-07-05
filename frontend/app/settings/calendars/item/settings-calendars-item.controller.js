(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalSettingsCalendarsItemController', CalSettingsCalendarsItemController);

  function CalSettingsCalendarsItemController() {
    var self = this;

    self.$onInit = $onInit;
    self.unsubscribe = unsubscribe;

    function $onInit() {
    }

    function unsubscribe() {
      console.log('Unsubscribe from', self.calendar);
    }
  }
})();
