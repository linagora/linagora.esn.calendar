(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .factory('calEventFreeBusyConfirmationModalService', calEventFreeBusyConfirmationModalService);

  function calEventFreeBusyConfirmationModalService($modal) {
    return function(onConfirm) {
      return $modal({
        templateUrl: '/calendar/app/freebusy/event-freebusy-confirmation-modal.html',
        controller: function() {
          this.submit = onConfirm;
        },
        controllerAs: 'ctrl',
        backdrop: 'static',
        placement: 'center'
      });
    };
  }
})(angular);
