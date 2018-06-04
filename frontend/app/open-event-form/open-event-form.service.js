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

    return function calOpenEventForm(fallbackCalendarHomeId, event, relatedEvents) {
      var calendarHomeId = calEventUtils.isNew(event) ? fallbackCalendarHomeId : event.calendarHomeId;
      var calendarId = calEventUtils.isNew(event) ? calDefaultValue.get('calendarId') : event.calendarId;

      calendarService.getCalendar(calendarHomeId, calendarId).then(function(calendar) {
        if (calUIAuthorizationService.canAccessEventDetails(calendar, event, session.user._id)) {
          if (!event.isInstance()) {
            _openForm(calendar, event, relatedEvents);
          } else {
            _openRecurringModal(calendar, event, relatedEvents);
          }
        } else {
          notificationFactory.weakInfo('Private event', 'Cannot access private event');
        }
      });
    };

    ////////////

    function _openForm(calendar, event, relatedEvents) {
      calEventUtils.setEditedEvent(event);
      if (modalIsOpen === false) {
        modalIsOpen = true;
        $modal({
          templateUrl: '/calendar/app/open-event-form/event-form-view',
          resolve: {
            event: function(calEventUtils) {
              return calEventUtils.getEditedEvent();
            },
            relatedEvents: function() {
              return relatedEvents;
            }
          },
          controller: function($scope, event, relatedEvents) {
            var _$hide = $scope.$hide;

            var unregister = $rootScope.$on(CAL_EVENTS.MODAL + '.hide', function() {
              $rootScope.$broadcast(CAL_EVENTS.CALENDAR_UNSELECT);
              $scope.cancel && $scope.cancel();
            });

            $scope.$hide = function() {
              _$hide.apply(this, arguments);
              modalIsOpen = false;
              unregister && unregister();
            };

            $scope.event = event;
            $scope.relatedEvents = relatedEvents;
            $scope.calendarHomeId = session.user._id;
          },
          backdrop: 'static',
          placement: 'center',
          prefixEvent: CAL_EVENTS.MODAL
        });
      }
    }

    function _openRecurringModal(calendar, event, relatedEvents) {
      $modal({
        templateUrl: '/calendar/app/open-event-form/edit-instance-or-series',
        resolve: {
          calendar: function() {
            return calendar;
          },
          event: function() {
            return event;
          },
          relatedEvents: function() {
            return relatedEvents;
          },
          openForm: function() {
            return _openForm;
          }
        },
        controller: function($scope, calendar, event, openForm, relatedEvents) {
          $scope.event = event;
          $scope.relatedEvents = relatedEvents;
          $scope.calendarHomeId = calendar.calendarHomeId;
          $scope.editChoice = 'this';

          $scope.submit = function() {
            $scope.$hide();

            ($scope.editChoice === 'this' ? editInstance : editAllInstances)();
          };

          function editAllInstances() {
            event.getModifiedMaster(true).then(function(eventMaster) {
              openForm(calendar, eventMaster, relatedEvents);
            });
          }

          function editInstance() {
            openForm(calendar, event, relatedEvents);
          }
        },
        placement: 'center'
      });
    }
  }
})();
