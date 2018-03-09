(function() {
  'use strict';

  angular.module('esn.calendar')
    .factory('calEventDateSuggestionModal', calEventDateSuggestionModal);

  function calEventDateSuggestionModal($rootScope, $modal, CAL_EVENTS) {
    var modalIsOpen = false;

    return function(event) {
      if (modalIsOpen === false) {
        modalIsOpen = true;
        $modal({
          templateUrl: '/calendar/app/components/event-date-suggestion/modal/event-date-suggestion-modal.html',
          resolve: {
            event: function() {
              return event.clone();
            }
          },
          controller: function($scope, event) {
            var _$hide = $scope.$hide;

            var unregister = $rootScope.$on(CAL_EVENTS.MODAL + '.hide', function() {
              modalIsOpen = false;
            });

            $scope.$hide = hide;
            $scope.event = event;
            $scope.submit = function() {
              // TODO: Send is implemented in #1150
              hide();
            };

            function hide() {
              _$hide.apply(this, arguments);
              modalIsOpen = false;
              unregister && unregister();
            }
          },
          backdrop: 'static',
          placement: 'center',
          prefixEvent: CAL_EVENTS.MODAL
        });
      }
    };
  }
})();
