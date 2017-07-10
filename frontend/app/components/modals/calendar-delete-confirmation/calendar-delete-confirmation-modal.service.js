(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .factory('calCalendarDeleteConfirmationModalService', calCalendarDeleteConfirmationModalService);

  function calCalendarDeleteConfirmationModalService($modal) {
    return function(calendar, onConfirm) {
      return $modal({
        templateUrl: '/calendar/app/components/modals/calendar-delete-confirmation/calendar-delete-confirmation-modal.html',
        controller: function() {
          this.calendarName = calendar.name;
          this.delete = onConfirm;
        },
        controllerAs: 'ctrl',
        backdrop: 'static',
        placement: 'center'
      });
    };
  }
})(angular);
