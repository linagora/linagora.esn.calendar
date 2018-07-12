'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const Q = require('q');
const mockery = require('mockery');

describe('The EventMailListener module', function() {
  let amqpClient, amqpClientProviderMock, userMock, loggerMock, caldavClientMock, caldavClientLib, pubsubMock, subscribe;
  let processMessageFunction, jsonMessage, calendarModulePath, moduleConfig, esnConfigMock, getConfig;
  let exchanges, defaultExchange;

  beforeEach(function() {

    calendarModulePath = this.moduleHelpers.modulePath;

    jsonMessage = {
      method: 'REQUEST',
      sender: 'a@b.com',
      recipient: 'admin@open-paas.org',
      uid: 'Test',
      'recurrence-id': '',
      sequence: '1',
      dtstamp: '',
      ical: 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Sabre//Sabre VObject 4.1.2//EN\r\nEND:VCALENDAR\r\n'
    };

    amqpClient = {
      ack: sinon.stub().returns(true)
    };

    amqpClientProviderMock = {
      getClient: () => Q.resolve(amqpClient)
    };

    userMock = {
      findByEmail: (email, cb) => {
        cb(null, {id: 'userId'});
      }
    };

    loggerMock = {
      debug: () => {},
      error: sinon.spy(),
      info: sinon.spy(),
      warn: sinon.spy()
    };

    caldavClientMock = {
      iTipRequest: sinon.spy(function() {
        return Q.when();
      })
    };

    defaultExchange = 'james:events';

    exchanges = ['james:events1', 'james:events2'];

    moduleConfig = {
      exchanges
    };

    getConfig = sinon.stub().returns(Q.when(moduleConfig));

    esnConfigMock = () => ({
      inModule: () => ({
        get: getConfig
      })
    });

    caldavClientLib = function() {
      return caldavClientMock;
    };

    subscribe = sinon.stub();

    pubsubMock = {
      global: {
        topic: sinon.stub().returns({
          subscribe
        })
      }
    };

    mockery.registerMock('../caldav-client', caldavClientLib);

    this.moduleHelpers.addDep('amqpClientProvider', amqpClientProviderMock);
    this.moduleHelpers.addDep('user', userMock);
    this.moduleHelpers.addDep('logger', loggerMock);
    this.moduleHelpers.addDep('esn-config', esnConfigMock);
    this.moduleHelpers.addDep('pubsub', pubsubMock);

    this.requireModule = function() {
      return require(calendarModulePath + '/backend/lib/event-mail-listener')(this.moduleHelpers.dependencies);
    };

    this.checksIfNoMongoConfiguration = function(done) {
      this.requireModule()
        .init()
        .then(function() {

          expect(loggerMock.info).to.have.been.calledWith('CalEventMailListener : Missing configuration in mongoDB, fallback to default james:events');
          expect(pubsubMock.global.topic).to.have.been.calledWith(defaultExchange);
          expect(subscribe).to.have.been.calledWith(sinon.match.func, { durable: true });

          done();
        })
        .catch(function(err) {
          done(err || 'Err');
        });
    };
  });

  describe('the init and subscribe functions', function() {
    it('should call esnConfig when initialize the listener', function(done) {
      getConfig = sinon.spy(function() {
        return Q.when();
      });

      this.requireModule()
        .init()
        .then(function() {

          expect(getConfig).to.have.been.called;

          done();
        })
        .catch(function(err) {
          done(err || 'Err');
        });
    });

    it('should log a warning message and subscribe with default configuration', function(done) {
      getConfig = sinon.stub().returns(Q.when(undefined));

      this.checksIfNoMongoConfiguration(done);
    });

    it('should log a warning message and subscribe with the default exchange if mongoDB configuration does not contain the exchanges', function(done) {
      getConfig = sinon.stub().returns(Q.when({}));

      this.checksIfNoMongoConfiguration(done);
    });

    it('should log a warning message and subscribe function with the default exchange if mongoDB configuration contains an empty array for the exchanges field', function(done) {
      moduleConfig = {
        exchanges: []
      };

      getConfig = sinon.stub().returns(Q.when(moduleConfig));

      this.checksIfNoMongoConfiguration(done);
    });

    it('should call the subscribe function with the right exchange from the mongoDB configuration', function(done) {
      this.requireModule()
        .init()
        .then(function() {

          expect(subscribe).to.have.been.calledTwice;

          done();
        })
        .catch(function(err) {
          done(err || 'Err');
        });
    });
  });

  describe('_checkMandatoryFields function', function() {
    it('should ignore message and log if method is missing', function(done) {
      delete jsonMessage.method;

      this.requireModule()
        .init()
        .then(function() {
          processMessageFunction = subscribe.firstCall.args[0];
          processMessageFunction(jsonMessage);

          expect(loggerMock.warn).to.have.been.calledWith('CalEventMailListener : Missing some mandatory fields, event ignored');
          expect(caldavClientMock.iTipRequest).to.not.have.been.called;

          done();
        })
        .catch(function(err) {
          done(err || 'Err');
        });
    });

    it('should ignore message and log if sender is missing', function(done) {
      delete jsonMessage.sender;

      this.requireModule()
        .init()
        .then(function() {
          processMessageFunction = subscribe.firstCall.args[0];
          processMessageFunction(jsonMessage);

          expect(loggerMock.warn).to.have.been.calledWith('CalEventMailListener : Missing some mandatory fields, event ignored');
          expect(caldavClientMock.iTipRequest).to.not.have.been.called;

          done();
        })
        .catch(function(err) {
          done(err || 'Err');
        });
    });

    it('should ignore message and log if recipient is missing', function(done) {
      delete jsonMessage.recipient;

      this.requireModule()
        .init()
        .then(function() {
          processMessageFunction = subscribe.firstCall.args[0];
          processMessageFunction(jsonMessage);

          expect(loggerMock.warn).to.have.been.calledWith('CalEventMailListener : Missing some mandatory fields, event ignored');
          expect(caldavClientMock.iTipRequest).to.not.have.been.called;

          done();
        })
        .catch(function(err) {
          done(err || 'Err');
        });
    });

    it('should ignore message and log if uid is missing', function(done) {
      delete jsonMessage.uid;

      this.requireModule()
        .init()
        .then(function() {
          processMessageFunction = subscribe.firstCall.args[0];
          processMessageFunction(jsonMessage);

          expect(loggerMock.warn).to.have.been.calledWith('CalEventMailListener : Missing some mandatory fields, event ignored');
          expect(caldavClientMock.iTipRequest).to.not.have.been.called;

          done();
        })
        .catch(function(err) {
          done(err || 'Err');
        });
    });
  });

  describe('recipient email checks', function() {
    it('should ignore message and log if recipient not found in OP and ack the message', function(done) {
      userMock.findByEmail = (email, cb) => {
        cb(null, null);
      };

      var originalMessage = {};

      this.requireModule()
        .init()
        .then(function() {
          processMessageFunction = subscribe.firstCall.args[0];
          processMessageFunction(jsonMessage, originalMessage);

          setTimeout(function() {
            expect(caldavClientMock.iTipRequest).to.not.have.been.called;
            expect(amqpClient.ack).to.have.been.calledWith(originalMessage);

            done();
          });
        })
        .catch(function(err) {
          done(err || 'Err');
        });
    });

    it('should ignore message and log if userModule fail', function(done) {
      userMock.findByEmail = (email, cb) => {
        cb('Error', null);
      };

      this.requireModule()
        .init()
        .then(function() {
          processMessageFunction = subscribe.firstCall.args[0];
          processMessageFunction(jsonMessage);

          expect(amqpClient.ack).to.not.have.been.called;
          expect(caldavClientMock.iTipRequest).to.not.have.been.called;

          done();
        })
        .catch(function(err) {
          done(err || 'Err');
        });
    });
  });

  describe('_handleMessage function', function() {
    it('should send request if message is valid and ack the message', function(done) {
      var originalMessage = {};

      this.requireModule()
        .init()
        .then(function() {
          processMessageFunction = subscribe.firstCall.args[0];
          processMessageFunction(jsonMessage, originalMessage);

          expect(caldavClientMock.iTipRequest).to.have.been.calledWith('userId', jsonMessage);

          setTimeout(function() {
            expect(amqpClient.ack).to.have.been.calledWith(originalMessage);

            done();
          });
        })
        .catch(function(err) {
          done(err || 'Err');
        });
    });
  });
});
