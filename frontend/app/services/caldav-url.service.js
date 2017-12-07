(function(angular) {
  'use strict';

  angular.module('esn.calendar').factory('calCalDAVURLService', calCalDAVURLService);

  function calCalDAVURLService($window, httpConfigurer, CAL_DAV_PATH) {
    return {
      getCalendarURL: getCalendarURL
    };

    function getCalendarURL(calendar) {
      return $window.location.origin + (httpConfigurer.getUrl(CAL_DAV_PATH + calendar.href)).replace('.json', '');
    }
  }
})(angular);
