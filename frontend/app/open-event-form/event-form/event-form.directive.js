(function() {
  'use strict';

  angular.module('esn.calendar')
    .directive('calEventForm', calEventForm);

  function calEventForm($timeout, calEventUtils) {
    var directive = {
      restrict: 'E',
      templateUrl: '/calendar/app/open-event-form/event-form/event-form.html',
      link: link,
      replace: true,
      controller: 'CalEventFormController'
    };

    return directive;

    ////////////

    function link(scope, element) {
      $timeout(focusTitle, 0);
      element.on('$destroy', calEventUtils.resetStoredEvents);
      scope.$on('$locationChangeStart', hideModal);

      ////////////

      function focusTitle() {
        element.find('.title')[0].focus();
      }

      function hideModal(event) {
        if (scope.$isShown) {
          event.preventDefault();
          scope.$hide();
        }
      }
    }
  }

})();
