(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalSettingsCalendarsController', CalSettingsCalendarsController);

  function CalSettingsCalendarsController() {
    var self = this;

    self.$onInit = $onInit;

    function $onInit() {
      self.calendars = [{name: 'My calendar', description: 'My description'}, {name: 'Events', description: 'My personal events'}];
    }
  }
})();
