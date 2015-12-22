'use strict';

angular.module('esn.calendar')

  .controller('communityCalendarController', function($scope, community, COMMUNITY_UI_CONFIG) {
    $scope.calendarHomeId = community._id;
    $scope.uiConfig = COMMUNITY_UI_CONFIG;
  })

  .controller('userCalendarController', function($scope, user, headerService, USER_UI_CONFIG) {
    $scope.calendarHomeId = user._id;
    $scope.uiConfig = angular.copy(USER_UI_CONFIG);

    headerService.mainHeader.addInjection('calendar-header-content');
    headerService.subHeader.addInjection('calendar-header-mobile', $scope);
    $scope.$on('$destroy', function() {
      headerService.resetAllInjections();
    });
  })

  .controller('calendarController', function($scope, $rootScope, $window, $modal, $timeout, $log, $alert, CALENDAR_EVENTS, CalendarShell, uiCalendarConfig, calendarService, calendarUtils, eventUtils, notificationFactory, calendarEventSource, livenotification, gracePeriodService, MAX_CALENDAR_RESIZE_HEIGHT, calendarCurrentView) {

    var windowJQuery = angular.element($window);

    function getCalendar() {
      return uiCalendarConfig.calendars[$scope.calendarHomeId];
    }

    $scope.resizeCalendarHeight = function() {
      var height = windowJQuery.height() - getCalendar().offset().top;
      height = height > MAX_CALENDAR_RESIZE_HEIGHT ? MAX_CALENDAR_RESIZE_HEIGHT : height;
      getCalendar().fullCalendar('option', 'height', height);
      $rootScope.$broadcast(CALENDAR_EVENTS.CALENDAR_HEIGHT, height);
    };

    $scope.eventClick = function(event) {
      $scope.event = event.clone();
      $scope.modal = $modal({scope: $scope, template: '/calendar/views/event-quick-form/event-quick-form-modal', backdrop: 'static'});
    };

    $scope.eventDropAndResize = function(event, delta, _revertFunc) {
      var path = event.path || '/calendars/' + $scope.calendarHomeId + '/events';
      $scope.event = new CalendarShell(event.vcalendar, {
        etag: event.etag,
        path: event.path,
        gracePeriodTaskId: event.gracePeriodTaskId
      });
      $scope.event.start = event.start;
      $scope.event.end = event.end;

      function revertFunc() {
        _revertFunc();
        $rootScope.$broadcast(CALENDAR_EVENTS.REVERT_MODIFICATION, event);
      }

      calendarService.modifyEvent(path, event, null, event.etag, delta.milliseconds !== 0, revertFunc)
        .then(function(response) {
          if (response) {
            notificationFactory.weakInfo('Calendar - ', event.title + ' has been modified.');
          }
        });
    };

    windowJQuery.resize($scope.resizeCalendarHeight);

    calendarService.calendarHomeId = $scope.calendarHomeId;

    $scope.eventRender = eventUtils.render;

    var currentView = calendarCurrentView.get();
    $scope.uiConfig.calendar.defaultDate = currentView.start || $scope.uiConfig.calendar.defaultDate;
    $scope.uiConfig.calendar.defaultView = currentView.name || $scope.uiConfig.calendar.defaultView;

    $scope.uiConfig.calendar.eventRender = $scope.eventRender;

    /*
     * "eventAfterAllRender" is called when all events are fetched but it
     * is not called when the davserver is unreachable so the "viewRender"
     * event is used to set the correct height but the event is called too
     * early and the calendar offset is wrong so wait with a timeout.
     */
    $scope.uiConfig.calendar.eventAfterAllRender = $scope.resizeCalendarHeight;

    $scope.uiConfig.calendar.viewRender = function(view) {
      $timeout($scope.resizeCalendarHeight, 1000);
      calendarCurrentView.save(view);
      $rootScope.$broadcast(CALENDAR_EVENTS.HOME_CALENDAR_VIEW_CHANGE, view);
    };

    $scope.uiConfig.calendar.eventClick = $scope.eventClick;
    $scope.uiConfig.calendar.eventResize = $scope.eventDropAndResize;
    $scope.uiConfig.calendar.eventDrop = $scope.eventDropAndResize;
    $scope.uiConfig.calendar.select = function(start, end) {
      var date = calendarUtils.getDateOnCalendarSelect(start, end);
      $scope.event = CalendarShell.fromIncompleteShell({
        start: date.start,
        end: date.end
      });
      $scope.modal = $modal({scope: $scope, template: '/calendar/views/event-quick-form/event-quick-form-modal', backdrop: 'static'});
    };

    $scope.displayCalendarError = function(err, errorMessage) {
      $alert({
        content: err && err.message || errorMessage,
        type: 'danger',
        show: true,
        position: 'bottom',
        container: '.calendar-error-message',
        duration: '3',
        animation: 'am-flip-x'
      });
    };

    $scope.eventSourcesMap = {};
    $scope.eventSources = [];
    calendarService.listCalendars($scope.calendarHomeId)
      .then(function(calendars) {
        $scope.calendars = calendars;
        $scope.calendars.forEach(function(calendar) {
          $scope.eventSourcesMap[calendar.href] = {
            events: calendarEventSource(calendar.href, $scope.displayCalendarError),
            color: calendar.color
          };
          getCalendar().fullCalendar('addEventSource', $scope.eventSourcesMap[calendar.href]);
        });
      })
      .catch($scope.displayCalendarError);

    function _modifiedCalendarItem(newEvent) {
      var event = getCalendar().fullCalendar('clientEvents', newEvent.id)[0];
      if (!event) {
        return;
      }

      // We fake the _allDay property to fix the case when switching from
      // allday to non-allday, as otherwise the end date is cleared and then
      // set to the wrong date by fullcalendar.
      newEvent._allDay = newEvent.allDay;
      newEvent._end = event._end;
      newEvent._id =  event._id;
      newEvent._start = event._start;

      /*
       * OR-1426 removing and create a new event in fullcalendar works much better than
       * updating it. Otherwise, we are loosing datas and synchronization like vcalendar, allday, attendees, vevent.
       */
      getCalendar().fullCalendar('removeEvents', newEvent.id);
      getCalendar().fullCalendar('renderEvent', newEvent);
    }

    var unregisterFunctions = [
      $rootScope.$on(CALENDAR_EVENTS.ITEM_MODIFICATION, function(event, data) {
        _modifiedCalendarItem(data);
      }),
      $rootScope.$on(CALENDAR_EVENTS.ITEM_REMOVE, function(event, data) {
        getCalendar().fullCalendar('removeEvents', data);
      }),
      $rootScope.$on(CALENDAR_EVENTS.ITEM_ADD, function(event, data) {
        getCalendar().fullCalendar('renderEvent', data);
      }),
      $rootScope.$on(CALENDAR_EVENTS.CALENDARS.TOGGLE_VIEW, function(event, calendar) {
        if (calendar.toggled) {
          getCalendar().fullCalendar('addEventSource', $scope.eventSourcesMap[calendar.href]);
        } else {
          getCalendar().fullCalendar('removeEventSource', $scope.eventSourcesMap[calendar.href]);
        }
      }),
      $rootScope.$on(CALENDAR_EVENTS.MINI_CALENDAR.DATE_CHANGE, function(event, newDate) {
        var view = getCalendar().fullCalendar('getView');
        if (newDate && !newDate.isBetween(view.start, view.end)) {
          getCalendar().fullCalendar('gotoDate', newDate);
        }
      })
    ];

    function liveNotificationHandlerOnCreate(msg) {
      uiCalendarConfig.calendars[$scope.calendarHomeId].fullCalendar('renderEvent', CalendarShell.fromJSON(msg));
    }

    function liveNotificationHandlerOnUpdate(msg) {
      _modifiedCalendarItem(CalendarShell.fromJSON(msg));
    }

    function liveNotificationHandlerOnDelete(msg) {
      uiCalendarConfig.calendars[$scope.calendarHomeId].fullCalendar('removeEvents', CalendarShell.fromJSON(msg).id);
    }

    var sio = livenotification('/calendars');
    sio.on(CALENDAR_EVENTS.WS.EVENT_CREATED, liveNotificationHandlerOnCreate);
    sio.on(CALENDAR_EVENTS.WS.EVENT_UPDATED, liveNotificationHandlerOnUpdate);
    sio.on(CALENDAR_EVENTS.WS.EVENT_DELETED, liveNotificationHandlerOnDelete);

    $scope.$on('$destroy', function() {
      sio.removeListener(CALENDAR_EVENTS.WS.EVENT_CREATED, liveNotificationHandlerOnCreate);
      sio.removeListener(CALENDAR_EVENTS.WS.EVENT_UPDATED, liveNotificationHandlerOnUpdate);
      sio.removeListener(CALENDAR_EVENTS.WS.EVENT_DELETED, liveNotificationHandlerOnDelete);
      unregisterFunctions.forEach(function(unregisterFunction) {
        unregisterFunction();
      });
      gracePeriodService.flushAllTasks();
      windowJQuery.off('resize', $scope.resizeCalendarHeight);
    });

    $window.addEventListener('beforeunload', gracePeriodService.flushAllTasks);
  });