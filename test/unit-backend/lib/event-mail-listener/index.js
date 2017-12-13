'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const Q = require('q');
const mockery = require('mockery');

describe('EventMailListener module', function() {
  let amqpClient, amqpClientProviderMock, userMock, loggerMock, caldavClientMock, caldavClientLib, pubsubMock;
  let notifyFunction, jsonMessage, calendarModulePath, moduleConfig, esnConfigMock, getConfig;
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
      ack: sinon.spy()
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

    pubsubMock = {
      local: {
        topic: function() {
          return {
            forward: function() {}
          };
        }
      },
      global: {
        topic: () => pubsubMock.global,
        subscribe: notifyFn => {
          notifyFunction = notifyFn;
        }
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

          expect(loggerMock.warn).to.have.been.calledWith('CalEventMailListener : Missing configuration in mongoDB');
          expect(pubsubMock.global.topic).to.have.been.calledWith(defaultExchange);

          done();
        })
        .catch(function(err) {
          done(err || 'Err');
        })
        .done();
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

    it('should log a warning message and call the global pubsub subscribe function with the default exchange if no mongoDB configuration', function(done) {
      getConfig = sinon.stub().returns(Q.when(undefined));

      pubsubMock.global.topic = sinon.spy(() => pubsubMock.global);

      this.checksIfNoMongoConfiguration(done);
    });

    it('should log a warning message and call the global pubsub subscribe function with the default exchange if mongoDB configuration does not contain the exchanges', function(done) {
      pubsubMock.global.topic = sinon.spy(() => pubsubMock.global);

      getConfig = sinon.stub().returns(Q.when({}));

      this.checksIfNoMongoConfiguration(done);
    });

    it('should log a warning message and call the global pubsub subscribe function with the default exchange if mongoDB configuration contains an empty array for the exchanges field', function(done) {
      pubsubMock.global.topic = sinon.spy(() => pubsubMock.global);

      moduleConfig = {
        exchanges: []
      };

      getConfig = sinon.stub().returns(Q.when(moduleConfig));

      this.checksIfNoMongoConfiguration(done);
    });

    it('should call the subscribe function with the right exchange from the mongoDB configuration', function(done) {
      pubsubMock.global.topic = sinon.spy(() => pubsubMock.global);

      this.requireModule()
        .init()
        .then(function() {

          expect(pubsubMock.global.topic).to.have.been.calledTwice;

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
          notifyFunction(jsonMessage);

          expect(loggerMock.warn).to.have.been.calledWith('CalEventMailListener : Missing mandatory field => Event ignored');
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
          notifyFunction(jsonMessage);

          expect(loggerMock.warn).to.have.been.calledWith('CalEventMailListener : Missing mandatory field => Event ignored');
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
          notifyFunction(jsonMessage);

          expect(loggerMock.warn).to.have.been.calledWith('CalEventMailListener : Missing mandatory field => Event ignored');
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
          notifyFunction(jsonMessage);

          expect(loggerMock.warn).to.have.been.calledWith('CalEventMailListener : Missing mandatory field => Event ignored');
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
          notifyFunction(jsonMessage, originalMessage);

          setTimeout(function() {
            expect(loggerMock.warn).to.have.been.calledWith('CalEventMailListener[Test] : Recipient user unknown in OpenPaas => Event ignored');
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
          notifyFunction(jsonMessage);

          expect(loggerMock.error).to.have.been.calledWith('CalEventMailListener[Test] : Could not connect to UserModule => Event ignored');
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
          notifyFunction(jsonMessage, originalMessage);

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
