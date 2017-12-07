(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalEventViewExternalUserController', CalEventViewExternalUserController);

  function CalEventViewExternalUserController() {
    console.log('IN CalEventViewExternalUserController ', this);
    var self = this;
  }
})();
