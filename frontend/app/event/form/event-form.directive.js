(function() {
  'use strict';

  angular.module('esn.calendar')
    .directive('calEventForm', calEventForm);

  function calEventForm() {
    var directive = {
      restrict: 'E',
      templateUrl: '/calendar/app/event/form/event-form.html',
      link: link,
      replace: true,
      controller: 'CalEventFormController'
    };

    return directive;

    ////////////

    function link(scope) {
      scope.$on('$locationChangeStart', hideModal);

      function hideModal(event) {
        if (scope.$isShown) {
          event.preventDefault();
          scope.$hide();
        }
      }
    }
  }

})();
