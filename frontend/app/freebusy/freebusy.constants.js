(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .constant('CAL_FREEBUSY', {
      UNKNOWN: 'unknown',
      FREE: 'free',
      busy: 'busy'
    });
})(angular);
