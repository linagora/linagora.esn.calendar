(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalEventViewExternalUserController', CalEventViewExternalUserController);

  function CalEventViewExternalUserController() {
    var self = this;

    self.$onInit = $onInit;

    function $onInit() {
      self.userAsAttendee = Object.create(self.externalAttendee);
    }
  }
})();
