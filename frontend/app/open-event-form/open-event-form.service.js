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

  function calOpenEventForm($rootScope, $modal, calendarService, calDefaultValue, calEventUtils, calUIAuthorizationService, notificationFactory, session, CAL_EVENTS) {
    var modalIsOpen = false;

    return function calOpenEventForm(fallbackCalendarHomeId, event) {
      var calendarHomeId = calEventUtils.isNew(event) ? fallbackCalendarHomeId : event.calendarHomeId;
      var calendarId = calEventUtils.isNew(event) ? calDefaultValue.get('calendarId') : event.calendarId;

      calendarService.getCalendar(calendarHomeId, calendarId).then(function(calendar) {
        if (calUIAuthorizationService.canAccessEventDetails(calendar, event, calDefaultValue.get('calendarId'))) {
          if (!event.isInstance()) {
            _openForm(calendar, event);
          } else {
            _openRecurringModal(calendar, event);
          }
        } else {
          notificationFactory.weakInfo('Private event', 'Cannot access private event');
        }
      });
    };

    ////////////

    function _openForm(calendar, event) {
      calEventUtils.setEditedEvent(event);
      if (modalIsOpen === false) {
        modalIsOpen = true;
        $modal({
          templateUrl: '/calendar/app/open-event-form/event-form-view',
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
          },
          backdrop: 'static',
          placement: 'center',
          prefixEvent: CAL_EVENTS.MODAL
        });
      }
    }

    function _openRecurringModal(calendar, event) {
      $modal({
        templateUrl: '/calendar/app/open-event-form/edit-instance-or-series',
        resolve: {
          calendar: function() {
            return calendar;
          },
          event: function() {
            return event;
          },
          openForm: function() {
            return _openForm;
          }
        },
        controller: function($scope, calendar, event, openForm) {
          $scope.event = event;
          $scope.calendarHomeId = calendar.calendarHomeId;

          $scope.editAllInstances = function() {
            $scope.$hide();
            event.getModifiedMaster().then(function(eventMaster) {
              openForm(calendar, eventMaster);
            });
          };

          $scope.editInstance = function() {
            $scope.$hide();
            openForm(calendar, event, event.recurrenceIdAsString);
          };
        },
        placement: 'center'
      });
    }
  }
})();
