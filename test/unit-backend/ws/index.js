const { expect } = require('chai');
const mockery = require('mockery');
const _ = require('lodash');
const sinon = require('sinon');
const CONSTANTS = require('../../../backend/lib/constants');
const wsEventsName = Object.keys(CONSTANTS.WEBSOCKET.EVENTS).map(key => CONSTANTS.WEBSOCKET.EVENTS[key]);
const subscriptionsName = Object.keys(CONSTANTS.EVENTS.SUBSCRIPTION).map(key => CONSTANTS.EVENTS.SUBSCRIPTION[key]);

describe('The calendar WS events module', function() {
  describe('init function', function() {
    let self, eventHandler, calendarHandler, subscriptionHandler;

    beforeEach(function() {
      self = this;

      this.publishSpy = sinon.spy();
      this.eventSubscribeSpy = sinon.spy(function(callback) {
        self.eventUpdatedPubsubCallback = callback;
      });

      this.calendarSubscribeSpy = sinon.spy(function(callback) {
        self.calendarUpdatedPubsubCallback = callback;
      });

      this.subscriptionSubscribeSpy = sinon.spy(function(callback) {
        self.subscriptionUpdatedPubsubCallback = callback;
      });

      this.pubsub = {
        global: {
          topic: sinon.spy(function(name) {
            if (subscriptionsName.indexOf(name) > -1) {
              return {
                subscribe: self.subscriptionSubscribeSpy
              };
            }

            if (wsEventsName.indexOf(name) > -1) {
              return {
                subscribe: self.eventSubscribeSpy
              };
            }

            return {
              subscribe: self.calendarSubscribeSpy
            };
          })
        }
      };
      this.io = {
        of: function() {
          const socket = {
            on: function() {
            }
          };

          return {
            on: function(event, callback) {
              return callback(socket);
            }
          };
        }
      };
      this.logger = {
        debug: function() {},
        warn: function() {},
        info: function() {},
        error: function() {}
      };
      this.helper = {
        getUserSocketsFromNamespace: function() {}
      };
      this.userModule = {};
      this.moduleHelpers.addDep('logger', self.logger);
      this.moduleHelpers.addDep('wsserver', {io: self.io, ioHelper: self.helper});
      this.moduleHelpers.addDep('pubsub', self.pubsub);
      this.moduleHelpers.addDep('user', self.userModule);

      eventHandler = {
        notify: sinon.spy()
      };
      mockery.registerMock('./handlers/event', function() {
        return eventHandler;
      });

      calendarHandler = {
        notify: sinon.spy()
      };
      mockery.registerMock('./handlers/calendar', function() {
        return calendarHandler;
      });

      subscriptionHandler = {
        notify: sinon.spy()
      };
      mockery.registerMock('./handlers/subscription', function() {
        return subscriptionHandler;
      });
    });

    it('should register pubsub subscribers for supported events', function() {
      const mod = require(this.moduleHelpers.backendPath + '/ws');

      mod.init(this.moduleHelpers.dependencies);
      _.forOwn(CONSTANTS.WEBSOCKET.EVENTS, topic => {
        expect(this.pubsub.global.topic).to.have.been.calledWith(topic);
      });

      _.forOwn(CONSTANTS.EVENTS.CALENDAR, topic => {
        expect(this.pubsub.global.topic).to.have.been.calledWith(topic);
      });

      _.forOwn(CONSTANTS.EVENTS.SUBSCRIPTION, topic => {
        expect(this.pubsub.global.topic).to.have.been.calledWith(topic);
      });
    });

    describe('When message is received in events global pubsub', function() {
      beforeEach(function() {
        const mod = require(this.moduleHelpers.backendPath + '/ws');

        mod.init(this.moduleHelpers.dependencies);
      });

      it('should publish it to global and call eventHandler.notify with corresponding event', function() {
        const message = {foo: 'bar'};

        self.eventUpdatedPubsubCallback(message);

        expect(eventHandler.notify).to.have.been.calledWith(CONSTANTS.EVENTS.EVENT.REPLY, message);
      });
    });

    describe('When message is received in calendars global pubsub', function() {
      beforeEach(function() {
        const mod = require(this.moduleHelpers.backendPath + '/ws');

        mod.init(this.moduleHelpers.dependencies);
      });

      it('should call calendarHandler.notify', function() {
        const message = {foo: 'bar'};
        const lastKey = Object.keys(CONSTANTS.EVENTS.CALENDAR).pop();

        self.calendarUpdatedPubsubCallback(message);

        expect(calendarHandler.notify).to.have.been.calledWith(CONSTANTS.EVENTS.CALENDAR[lastKey], message);
        expect(self.publishSpy).to.not.have.been.called;
      });
    });

    describe('When message is received in subscription global pubsub', function() {
      beforeEach(function() {
        const mod = require(this.moduleHelpers.backendPath + '/ws');

        mod.init(this.moduleHelpers.dependencies);
      });

      it('should call subscriptionHandler.notify', function() {
        const message = {foo: 'bar'};
        const lastKey = Object.keys(CONSTANTS.EVENTS.SUBSCRIPTION).pop();

        self.subscriptionUpdatedPubsubCallback(message);

        expect(subscriptionHandler.notify).to.have.been.calledWith(CONSTANTS.EVENTS.SUBSCRIPTION[lastKey], message);
        expect(self.publishSpy).to.not.have.been.called;
      });
    });
  });
});
