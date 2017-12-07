(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalEventViewInternalUserController', CalEventViewInternalUserController);

  function CalEventViewInternalUserController() {
    console.log('IN CalEventViewInternalUserController ', this);
    var self = this;
  }
})();
