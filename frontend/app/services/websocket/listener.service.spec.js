'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The calWebsocketListenerService service', function() {
  var $rootScope, $q, $log, scope, liveNotification, calWebsocketListenerService, CAL_WEBSOCKET;
  var CalendarShellMock, calEventServiceMock, calendarServiceMock, calendarEventEmitterMock, calMasterEventCacheMock, calCachedEventSourceMock;
  var calendarHomeId, calendarId, calendarPath;

  beforeEach(function() {
    var liveNotificationMock = function(namespace) {
      if (liveNotification) {
        return liveNotification(namespace);
      }

      return {
        on: function() {},
        removeListener: function() {}
      };
    };

    calendarServiceMock = {};
    calendarId = 'calendarId';
    calendarHomeId = 'calendarHomeId';
    calendarPath = calendarHomeId + '/' + calendarId + '.json';

    CalendarShellMock = function() {
      return self.CalendarShellConstMock.apply(this, arguments);
    };

    CalendarShellMock.from = sinon.spy(function(event, extendedProp) {
      return angular.extend({}, event, extendedProp);
    });

    CalendarShellMock.fromIncompleteShell = sinon.spy();

    calendarEventEmitterMock = {
      emitModifiedEvent: sinon.spy(),
      emitRemovedEvent: sinon.spy()
    };

    calMasterEventCacheMock = {
      save: sinon.spy(),
      get: sinon.spy(),
      remove: sinon.spy()
    };

    calCachedEventSourceMock = {
      wrapEventSource: sinon.spy(function(id, eventSource) {
        return eventSource;
      }),
      resetCache: sinon.spy(),
      registerUpdate: sinon.spy(),
      registerDelete: sinon.spy()
    };

    calEventServiceMock = {
      createEvent: function() {
        return $q.when({});
      },
      modifyEvent: sinon.spy(function() {
        return $q.when();
      })
    };

    angular.mock.module('esn.calendar');
    angular.mock.module(function($provide) {
      $provide.value('livenotification', liveNotificationMock);
      $provide.value('CalendarShell', CalendarShellMock);
      $provide.value('calendarEventEmitter', calendarEventEmitterMock);
      $provide.value('calMasterEventCache', calMasterEventCacheMock);
      $provide.value('calCachedEventSource', calCachedEventSourceMock);
      $provide.value('calEventService', calEventServiceMock);
      $provide.value('calendarService', calendarServiceMock);
      $provide.value('Cache', function() {});
    });
  });

  beforeEach(angular.mock.inject(function(_$controller_, _$rootScope_, _$q_, _$log_, _calWebsocketListenerService_, _CAL_WEBSOCKET_) {
    $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    $q = _$q_;
    $log = _$log_;
    calWebsocketListenerService = _calWebsocketListenerService_;
    CAL_WEBSOCKET = _CAL_WEBSOCKET_;
  }));

  afterEach(function() {
    liveNotification = null;
  });

  describe('The listenEvents function', function() {
    var listener, wsEventCreateListener, wsEventModifyListener, wsEventDeleteListener, wsEventRequestListener, wsEventReplyListener, wsEventCancelListener, testUpdateCalCachedEventSourceAndFcEmit, testUpdateCalMasterEventCache, wsSubscriptionCreatedListener, wsSubscriptionUpdatedListener, wsSubscriptionDeletedListener;

    beforeEach(function() {
      liveNotification = function(namespace) {
        expect(namespace).to.equal(CAL_WEBSOCKET.NAMESPACE);

        return {
          removeListener: sinon.spy(),
          on: function(event, handler) {
            switch (event) {
              case CAL_WEBSOCKET.EVENT.CREATED:
                wsEventCreateListener = handler;
                break;
              case CAL_WEBSOCKET.EVENT.UPDATED:
                wsEventModifyListener = handler;
                break;
              case CAL_WEBSOCKET.EVENT.DELETED:
                wsEventDeleteListener = handler;
                break;
              case CAL_WEBSOCKET.EVENT.REQUEST:
                wsEventRequestListener = handler;
                break;
              case CAL_WEBSOCKET.EVENT.REPLY:
                wsEventReplyListener = handler;
                break;
              case CAL_WEBSOCKET.EVENT.CANCEL:
                wsEventCancelListener = handler;
                break;
              case CAL_WEBSOCKET.SUBSCRIPTION.CREATED:
                wsSubscriptionCreatedListener = handler;
                break;
              case CAL_WEBSOCKET.SUBSCRIPTION.UPDATED:
                wsSubscriptionUpdatedListener = handler;
                break;
              case CAL_WEBSOCKET.SUBSCRIPTION.DELETED:
                wsSubscriptionDeletedListener = handler;
                break;
              }
          }
        };
      };

      testUpdateCalCachedEventSourceAndFcEmit = function(wsCallback, expectedCacheMethod, expectedEmitMethod) {
        var event = {id: 'id', calendarId: 'calId'};
        var path = 'path';
        var etag = 'etag';
        var resultingEvent = CalendarShellMock.from(event, {etag: etag, path: path});

        wsCallback({event: event, eventPath: path, etag: etag});
        scope.$digest();

        expect(CalendarShellMock.from).to.have.been.calledWith(event, {path: path, etag: etag});
        expect(calendarEventEmitterMock[expectedEmitMethod]).to.have.been.calledWith(resultingEvent);
        expect(calCachedEventSourceMock[expectedCacheMethod]).to.have.been.calledWith(resultingEvent);
      };

      testUpdateCalMasterEventCache = function(wsCallback, expectedCacheMethod) {
        var event = {id: 'id', calendarId: 'calId'};
        var path = 'path';
        var etag = 'etag';
        var resultingEvent = CalendarShellMock.from(event, {etag: etag, path: path});

        wsCallback({event: event, eventPath: path, etag: etag});
        scope.$digest();

        expect(CalendarShellMock.from).to.have.been.calledWith(event, {path: path, etag: etag});
        expect(calMasterEventCacheMock[expectedCacheMethod]).to.have.been.calledWith(resultingEvent);
      };

      listener = calWebsocketListenerService.listenEvents();
    });

    it('should return a valid hash', function() {
      expect(listener.sio).to.exist;
      expect(listener.clean).to.be.a.function;
    });

    it('should remove all liveNotification listeners when calling clean', function() {
      listener.clean();

      expect(listener.sio.removeListener.getCalls().length).to.equal(12);
    });

    it('should update event on calCachedEventSource and emit an event for a modification on EVENT_CREATED', function() {
      testUpdateCalCachedEventSourceAndFcEmit(wsEventCreateListener, 'registerUpdate', 'emitModifiedEvent');
    });

    it('should update event on calCachedEventSource and broadcast emit an event for a modification on EVENT_REQUEST', function() {
      testUpdateCalCachedEventSourceAndFcEmit(wsEventRequestListener, 'registerUpdate', 'emitModifiedEvent');
    });

    it('should update event on calCachedEventSource and broadcast emit an event for a modification on EVENT_UPDATED', function() {
      testUpdateCalCachedEventSourceAndFcEmit(wsEventModifyListener, 'registerUpdate', 'emitModifiedEvent');
    });

    it('should remove event on calCachedEventSource and broadcast emit an event for a deletion on EVENT_DELETED', function() {
      testUpdateCalCachedEventSourceAndFcEmit(wsEventDeleteListener, 'registerDelete', 'emitRemovedEvent');
    });

    it('should remove event on calCachedEventSource and broadcast emit an event for a deletion on EVENT_CANCEL', function() {
      testUpdateCalCachedEventSourceAndFcEmit(wsEventCancelListener, 'registerDelete', 'emitRemovedEvent');
    });

    it('should update event on calMasterEventCache or a modification on EVENT_CREATED', function() {
      testUpdateCalMasterEventCache(wsEventCreateListener, 'save');
    });

    it('should update event on calMasterEventCache for a modification on EVENT_REQUEST', function() {
      testUpdateCalMasterEventCache(wsEventRequestListener, 'save');
    });

    it('should update event on calMasterEventCache for a modification on EVENT_UPDATED', function() {
      testUpdateCalMasterEventCache(wsEventModifyListener, 'save');
    });

    it('should compute new event and update cache if on cache on EVENT_REPLY', function() {
      var event = {id: 'id', calendarId: 'calId'};
      var path = 'path';
      var etag = 'etag';
      var resultingEvent = CalendarShellMock.from(event, {etag: etag, path: path});
      var originalEvent = {applyReply: sinon.spy()};

      calMasterEventCacheMock.get = sinon.stub().returns(originalEvent);
      wsEventReplyListener({event: event, eventPath: path, etag: etag});
      scope.$digest();

      expect(CalendarShellMock.from).to.have.been.calledWith(event, {path: path, etag: etag});
      expect(calMasterEventCacheMock.get).to.have.been.calledWith(path);
      expect(originalEvent.applyReply).to.have.been.calledWith(resultingEvent);
      expect(calendarEventEmitterMock.emitModifiedEvent).to.have.been.calledWith(originalEvent);
      expect(calCachedEventSourceMock.registerUpdate).to.have.been.calledWith(originalEvent);
    });

    it('should fetch new event master if not already on catch on EVENT_REPLY', function() {
      var event = {id: 'id', calendarId: 'calId'};
      var path = 'path';
      var etag = 'etag';
      var originalEvent = {};

      calEventServiceMock.getEvent = sinon.stub().returns($q.when(originalEvent));
      wsEventReplyListener({event: event, eventPath: path, etag: etag});
      scope.$digest();

      expect(calMasterEventCacheMock.get).to.have.been.calledWith(path);
      expect(calEventServiceMock.getEvent).to.have.been.calledWith(path);
      expect(calendarEventEmitterMock.emitModifiedEvent).to.have.been.calledWith(sinon.match(originalEvent));
      expect(calCachedEventSourceMock.registerUpdate).to.have.been.calledWith(sinon.match(originalEvent));
      expect(calMasterEventCacheMock.save).to.have.been.calledWith(sinon.match(originalEvent));
    });

    it('should remove event on calMasterEventCache for a deletion on EVENT_DELETED', function() {
      testUpdateCalMasterEventCache(wsEventDeleteListener, 'remove');
    });

    it('should remove event on calMasterEventCache for a deletion on EVENT_CANCEL', function() {
      testUpdateCalMasterEventCache(wsEventCancelListener, 'remove');
    });

    describe('on SUBSCRIPTION.CREATED event', function() {
      it('should fetch and add calendar', function() {
        var calendarCollectionShell = {_id: 1};

        calendarServiceMock.getCalendar = sinon.spy(function() {
          return $q.when(calendarCollectionShell);
        });
        calendarServiceMock.addAndEmit = sinon.spy();

        wsSubscriptionCreatedListener({calendarPath: calendarPath});
        scope.$digest();

        expect(calendarServiceMock.getCalendar).to.have.been.calledWith(calendarHomeId, calendarId);
        expect(calendarServiceMock.addAndEmit).to.have.been.calledWith(calendarHomeId, calendarCollectionShell);
      });

      it('should not add calendar when not found', function() {
        calendarServiceMock.getCalendar = sinon.spy(function() {
          return $q.when();
        });
        calendarServiceMock.addAndEmit = sinon.spy();

        wsSubscriptionCreatedListener({calendarPath: calendarPath});
        scope.$digest();

        expect(calendarServiceMock.getCalendar).to.have.been.calledWith(calendarHomeId, calendarId);
        expect(calendarServiceMock.addAndEmit).to.not.have.been.called;
      });

      it('should log error when calendarService.getCalendar fails', function() {
        var error = new Error('I failed to get the calendar');
        var errorSpy = sinon.spy($log, 'error');

        calendarServiceMock.getCalendar = sinon.spy(function() {
          return $q.reject(error);
        });
        calendarServiceMock.addAndEmit = sinon.spy();

        wsSubscriptionCreatedListener({calendarPath: calendarPath});
        scope.$digest();

        expect(calendarServiceMock.getCalendar).to.have.been.calledWith(calendarHomeId, calendarId);
        expect(calendarServiceMock.addAndEmit).to.not.have.been.called;
        expect(errorSpy).to.have.been.calledWith('Can not get the new calendar', error);
      });
    });

    describe('on SUBSCRIPTION.UPDATED event', function() {
      it('should fetch and update calendar', function() {
        var calendarCollectionShell = {_id: 1};

        calendarServiceMock.getCalendar = sinon.spy(function() {
          return $q.when(calendarCollectionShell);
        });
        calendarServiceMock.updateAndEmit = sinon.spy();

        wsSubscriptionUpdatedListener({calendarPath: calendarPath});
        scope.$digest();

        expect(calendarServiceMock.getCalendar).to.have.been.calledWith(calendarHomeId, calendarId);
        expect(calendarServiceMock.updateAndEmit).to.have.been.calledWith(calendarHomeId, calendarCollectionShell);
      });

      it('should not add calendar when not found', function() {
        calendarServiceMock.getCalendar = sinon.spy(function() {
          return $q.when();
        });
        calendarServiceMock.updateAndEmit = sinon.spy();

        wsSubscriptionCreatedListener({calendarPath: calendarPath});
        scope.$digest();

        expect(calendarServiceMock.getCalendar).to.have.been.calledWith(calendarHomeId, calendarId);
        expect(calendarServiceMock.updateAndEmit).to.not.have.been.called;
      });

      it('should log error when calendarService.getCalendar fails', function() {
        var error = new Error('I failed to get the calendar');
        var errorSpy = sinon.spy($log, 'error');

        calendarServiceMock.getCalendar = sinon.spy(function() {
          return $q.reject(error);
        });
        calendarServiceMock.updateAndEmit = sinon.spy();

        wsSubscriptionUpdatedListener({calendarPath: calendarPath});
        scope.$digest();

        expect(calendarServiceMock.getCalendar).to.have.been.calledWith(calendarHomeId, calendarId);
        expect(calendarServiceMock.updateAndEmit).to.not.have.been.called;
        expect(errorSpy).to.have.been.calledWith('Can not get the updated calendar', error);
      });
    });

    describe('on SUBSCRIPTION.DELETED event', function() {
      it('should call calendarService.removeAndEmit', function() {
        calendarServiceMock.removeAndEmit = sinon.spy();
        wsSubscriptionDeletedListener({calendarPath: calendarPath});
        scope.$digest();

        expect(calendarServiceMock.removeAndEmit).to.have.been.calledWith(calendarHomeId, {id: calendarId});
      });
    });
  });
});
