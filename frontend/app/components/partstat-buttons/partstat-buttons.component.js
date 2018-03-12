(function(angular) {
  'use strict';

  angular.module('esn.calendar').component('calPartstatButtons', {
    templateUrl: '/calendar/app/components/partstat-buttons/partstat-buttons.html',
    bindings: {
      event: '=',
      changePartstat: '&?',
      onParticipationChangeSuccess: '&',
      onParticipationChangeError: '&',
      showDateSuggestion: '&'
    },
    controller: 'CalPartstatButtonsController',
    controllerAs: 'ctrl'
  });
})(angular);
