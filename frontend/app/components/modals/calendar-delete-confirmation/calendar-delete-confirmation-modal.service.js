(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .factory('calCalendarDeleteConfirmationModalService', calCalendarDeleteConfirmationModalService);

  function calCalendarDeleteConfirmationModalService($modal) {
    return function(calendar, onConfirm) {
      return $modal({
        templateUrl: '/calendar/app/components/modals/calendar-delete-confirmation/calendar-delete-confirmation-modal.html',
        controller: function($scope) {
          $scope.calendarName = calendar.name;
          $scope.delete = onConfirm;
        },
        backdrop: 'static',
        placement: 'center'
      });
    };
  }
})(angular);
