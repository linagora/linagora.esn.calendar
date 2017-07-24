(function() {
  'use strict';

  angular.module('esn.calendar')
    .factory('calWebsocketListenerService', calWebsocketListenerService);

  function calWebsocketListenerService(
    $q,
    $log,
    livenotification,
    calCachedEventSource,
    calEventService,
    calPathParser,
    calendarEventEmitter,
    calendarService,
    calMasterEventCache,
    CalendarShell,
    CAL_WEBSOCKET
  ) {

    return {
      listenEvents: listenEvents
    };

    function listenEvents() {
      var sio = livenotification(CAL_WEBSOCKET.NAMESPACE);

      sio.on(CAL_WEBSOCKET.EVENT.CREATED, _liveNotificationHandlerOnCreateRequestandUpdate.bind(null, CAL_WEBSOCKET.EVENT.CREATED));
      sio.on(CAL_WEBSOCKET.EVENT.REQUEST, _liveNotificationHandlerOnCreateRequestandUpdate.bind(null, CAL_WEBSOCKET.EVENT.REQUEST));
      sio.on(CAL_WEBSOCKET.EVENT.CANCEL, _liveNotificationHandlerOnDelete.bind(null, CAL_WEBSOCKET.EVENT.CANCEL));
      sio.on(CAL_WEBSOCKET.EVENT.UPDATED, _liveNotificationHandlerOnCreateRequestandUpdate.bind(null, CAL_WEBSOCKET.EVENT.UPDATED));
      sio.on(CAL_WEBSOCKET.EVENT.DELETED, _liveNotificationHandlerOnDelete.bind(null, CAL_WEBSOCKET.EVENT.DELETED));
      sio.on(CAL_WEBSOCKET.EVENT.REPLY, _liveNotificationHandlerOnReply.bind(null, CAL_WEBSOCKET.EVENT.REPLY));
      sio.on(CAL_WEBSOCKET.CALENDAR.CREATED, _onCalendarCreated.bind(null, CAL_WEBSOCKET.CALENDAR.CREATED));
      sio.on(CAL_WEBSOCKET.CALENDAR.UPDATED, _onCalendarUpdated.bind(null, CAL_WEBSOCKET.CALENDAR.UPDATED));
      sio.on(CAL_WEBSOCKET.CALENDAR.DELETED, _onCalendarDeleted.bind(null, CAL_WEBSOCKET.CALENDAR.DELETED));
      sio.on(CAL_WEBSOCKET.SUBSCRIPTION.CREATED, _onCalendarCreated.bind(null, CAL_WEBSOCKET.SUBSCRIPTION.CREATED));
      sio.on(CAL_WEBSOCKET.SUBSCRIPTION.UPDATED, _onCalendarUpdated.bind(null, CAL_WEBSOCKET.SUBSCRIPTION.UPDATED));
      sio.on(CAL_WEBSOCKET.SUBSCRIPTION.DELETED, _onCalendarDeleted.bind(null, CAL_WEBSOCKET.SUBSCRIPTION.DELETED));

      return {
        sio: sio
      };

      function _onCalendarCreated(type, msg) {
        $log.debug('Received a new calendar', type, msg);
        var calendarPath = calPathParser.parseCalendarPath(msg.calendarPath);

        calendarService.getCalendar(calendarPath.calendarHomeId, calendarPath.calendarId).then(function(calendarCollectionShell) {
          if (calendarCollectionShell) {
            calendarService.addAndEmit(calendarPath.calendarHomeId, calendarCollectionShell);
          }

        }).catch(function(err) {
          $log.error('Can not get the new calendar', err);
        });
      }

      function _onCalendarDeleted(type, msg) {
        $log.debug('Calendar deleted', type, msg);
        var calendarPath = calPathParser.parseCalendarPath(msg.calendarPath);

        calendarService.removeAndEmit(calendarPath.calendarHomeId, {id: calendarPath.calendarId});
      }

      function _onCalendarUpdated(type, msg) {
        $log.debug('Calendar updated', type, msg);
        var calendarPath = calPathParser.parseCalendarPath(msg.calendarPath);

        calendarService.getCalendar(calendarPath.calendarHomeId, calendarPath.calendarId).then(function(calendarCollectionShell) {
          if (calendarCollectionShell) {
            calendarService.updateAndEmit(calendarPath.calendarHomeId, calendarCollectionShell);
          }

        }).catch(function(err) {
          $log.error('Can not get the updated calendar', err);
        });
      }

      function _liveNotificationHandlerOnCreateRequestandUpdate(type, msg) {
        $log.debug('Calendar Event created/updated', type, msg);
        var event = CalendarShell.from(msg.event, {etag: msg.etag, path: msg.eventPath});

        calCachedEventSource.registerUpdate(event);
        calMasterEventCache.save(event);
        calendarEventEmitter.emitModifiedEvent(event);
      }

      function _liveNotificationHandlerOnReply(type, msg) {
        $log.debug('Calendar Event reply', type, msg);
        var replyEvent = CalendarShell.from(msg.event, {etag: msg.etag, path: msg.eventPath});
        var event = calMasterEventCache.get(replyEvent.path);

        event && event.applyReply(replyEvent);

        $q.when(event || calEventService.getEvent(replyEvent.path)).then(function(event) {
          calMasterEventCache.save(event);
          calCachedEventSource.registerUpdate(event);
          calendarEventEmitter.emitModifiedEvent(event);
        });
      }

      function _liveNotificationHandlerOnDelete(type, msg) {
        $log.debug('Calendar Event deleted/canceled', type, msg);
        var event = CalendarShell.from(msg.event, {etag: msg.etag, path: msg.eventPath});

        calCachedEventSource.registerDelete(event);
        calMasterEventCache.remove(event);
        calendarEventEmitter.emitRemovedEvent(event);
      }
    }
  }
})();
