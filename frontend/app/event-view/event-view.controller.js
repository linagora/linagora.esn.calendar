(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalEventViewController', CalEventViewController);

  function CalEventViewController() {
    console.log('IN CalEventViewController ', this)
  }
})();
