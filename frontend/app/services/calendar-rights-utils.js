(function() {
  'use strict';

  angular.module('esn.calendar')
    .factory('CalCalendarRightsUtilsService', CalCalendarRightsUtilsService);

  function CalCalendarRightsUtilsService(CAL_CALENDAR_PUBLIC_RIGHT_HUMAN_READABLE, CAL_CALENDAR_DELEGATION_RIGHT_HUMAN_READABLE) {
    return {
      publicAsHumanReadable: publicAsHumanReadable,
      delegationAsHumanReadable: delegationAsHumanReadable
    };

    function publicAsHumanReadable(right) {
      return angular.isString(right) ? CAL_CALENDAR_PUBLIC_RIGHT_HUMAN_READABLE[right] || CAL_CALENDAR_PUBLIC_RIGHT_HUMAN_READABLE.unknown : CAL_CALENDAR_PUBLIC_RIGHT_HUMAN_READABLE.unknown;
    }

    function delegationAsHumanReadable(right) {
      return angular.isString(right) ? CAL_CALENDAR_DELEGATION_RIGHT_HUMAN_READABLE[right] || CAL_CALENDAR_DELEGATION_RIGHT_HUMAN_READABLE.unknown : CAL_CALENDAR_DELEGATION_RIGHT_HUMAN_READABLE.unknown;
    }
  }
})();
