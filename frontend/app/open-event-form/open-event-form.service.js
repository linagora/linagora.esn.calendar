(function() {
  'use strict';

  /**
   * There are 2 types of form in the module:
   *   * The event form: this is a desktop and mobile view of an complete edition form for events.
   *   * The consult form: this is a desktop and mobile view of an consult form for events.
   * Note that mobile devices have only access to the full form and the consult form.
   * This service will open the correct form corresponding to the event and the screen size.
   */
  angular.module('esn.calendar')
    .factory('calOpenEventForm', calOpenEventForm);

  function calOpenEventForm($rootScope, $modal, calendarService, calEventUtils, calUIAuthorizationService, notificationFactory, session, CAL_DEFAULT_CALENDAR_ID, CAL_EVENTS) {
    var modalIsOpen = false;

    return function calOpenEventForm(fallbackCalendarHomeId, event) {
      var calendarHomeId = calEventUtils.isNew(event) ? fallbackCalendarHomeId : event.calendarHomeId;
      var calendarId = calEventUtils.isNew(event) ? CAL_DEFAULT_CALENDAR_ID : event.calendarId;

      calendarService.getCalendar(calendarHomeId, calendarId).then(function(calendar) {
        if (calUIAuthorizationService.canAccessEventDetails(calendar, event, session.user._id)) {
          !event.isInstance() ?
          _openForm(calendar, event) :
          event.getModifiedMaster().then(function(eventMaster) {
            _openForm(calendar, eventMaster, event);
          });
        } else {
          notificationFactory.weakInfo('Private event', 'Cannot access private event');
        }
      });
    };

    ////////////

    function _openForm(calendar, event, eventInstanceRecurrent) {
      calEventUtils.setEditedEvent(event);
      if (modalIsOpen === false) {
        modalIsOpen = true;
        $modal({
          templateUrl: '/calendar/app/open-event-form/event-form-view.html',
          resolve: {
            event: function(calEventUtils) {
              return calEventUtils.getEditedEvent();
            }
          },
          controller: function($scope, event) {
            var _$hide = $scope.$hide;
            var unregister = $rootScope.$on(CAL_EVENTS.MODAL + '.hide', function() {
              $rootScope.$broadcast(CAL_EVENTS.CALENDAR_UNSELECT);
              $scope.$hide();
            });

            $scope.$hide = function() {
              _$hide.apply(this, arguments);
              modalIsOpen = false;
              unregister && unregister();
            };

            $scope.event = event;
            $scope.calendarHomeId = session.user._id;

            if (eventInstanceRecurrent) {
              $scope.eventInstanceRecurrent = eventInstanceRecurrent;
            }
          },
          backdrop: 'static',
          placement: 'center',
          prefixEvent: CAL_EVENTS.MODAL
        });
      }
    }
  }
})();
