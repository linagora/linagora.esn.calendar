(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .factory('calFullCalendarPlanningRenderEventService', calFullCalendarPlanningRenderEventService);

  function calFullCalendarPlanningRenderEventService(
    session,
    calUIAuthorizationService
  ) {
    return function(calendar) {
      return function(event) {
        setEventRights();

        function setEventRights() {
          if (!calUIAuthorizationService.canModifyEvent(calendar, event, session.user._id)) {
            event.startEditable = false;
            event.durationEditable = false;
          }
        }
      };
    };
  }
})(angular);
