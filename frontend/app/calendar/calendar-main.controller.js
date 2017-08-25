(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('calCalendarMainController', calCalendarMainController);

  function calCalendarMainController(calFullUiConfiguration) {
    var self = this;

    self.$onInit = $onInit;

    function $onInit() {
      calFullUiConfiguration.get().then(function(calendarUiConfiguration) {
        self.uiConfig = calendarUiConfiguration;
        self.uiConfig.calendar.businessHours = self.businessHours;
        self.uiConfig.calendar.scrollTime = self.businessHours[0].start;
      });
    }
  }
})();
