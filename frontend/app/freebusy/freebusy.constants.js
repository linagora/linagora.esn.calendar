(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .constant('CAL_FREEBUSY', {
      UNNKWON: 'unknown',
      FREE: 'free',
      busy: 'busy'
    });
})(angular);
