(function() {
  'use strict';

  angular.module('esn.calendar')
  .factory('eventRecurringModalService', eventRecurringModalService);

  function eventRecurringModalService($modal) {
    return {
      openRecurringModal: openRecurringModal
    };

    function openRecurringModal(calendar, templateUrl, action) {
      if (calendar && templateUrl && action) {
        $modal({
          templateUrl: templateUrl,
          controller: function($scope) {
            $scope.calendarHomeId = calendar.calendarHomeId;

            $scope.applyOnAllInstances = function() {
              $scope.$hide();
              action();
            };

            $scope.applyOnInstance = function() {
              var isInstanceOfRecurrentEvent = true;
              $scope.$hide();
              action(isInstanceOfRecurrentEvent);
            };
          },
          placement: 'center'
        });
      }
    }
  }
})();
