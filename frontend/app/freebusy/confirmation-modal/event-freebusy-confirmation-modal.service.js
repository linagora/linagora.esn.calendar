(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .factory('calEventFreeBusyConfirmationModalService', calEventFreeBusyConfirmationModalService);

  function calEventFreeBusyConfirmationModalService($modal) {
    return function(onConfirm, onEdit, onCancel) {
      return $modal({
        templateUrl: '/calendar/app/freebusy/confirmation-modal/event-freebusy-confirmation-modal.html',
        controller: function() {
          this.submit = onConfirm;
          this.edit = function() {
            onEdit && onEdit();
          };
          this.displayEdit = onEdit;
          this.cancel = function() {
            onCancel && onCancel();
          };
        },
        controllerAs: 'ctrl',
        backdrop: 'static',
        placement: 'center'
      });
    };
  }
})(angular);
