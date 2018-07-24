'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const mockery = require('mockery');

describe('The EventMailListener module', function() {
  let userMock, loggerMock, caldavClientMock, caldavClientLib, messagingMock, receive;
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
      iTipRequest: sinon.stub().returns(Promise.resolve())
    };

    defaultExchange = 'james:events';

    exchanges = ['james:events1', 'james:events2'];

    moduleConfig = {
      exchanges
    };

    getConfig = sinon.stub().returns(Promise.resolve(moduleConfig));

    esnConfigMock = () => ({
      inModule: () => ({
        get: getConfig
      })
    });

    caldavClientLib = function() {
      return caldavClientMock;
    };

    receive = sinon.stub();

    messagingMock = {
      pointToPoint: {
        get: sinon.stub().returns({
          receive
        })
      }
    };

    mockery.registerMock('../caldav-client', caldavClientLib);

    this.moduleHelpers.addDep('user', userMock);
    this.moduleHelpers.addDep('logger', loggerMock);
    this.moduleHelpers.addDep('esn-config', esnConfigMock);
    this.moduleHelpers.addDep('messaging', messagingMock);

    this.requireModule = function() {
      return require(calendarModulePath + '/backend/lib/event-mail-listener')(this.moduleHelpers.dependencies);
    };

    this.checksIfNoMongoConfiguration = function(done) {
      this.requireModule()
        .init()
        .then(function() {

          expect(loggerMock.info).to.have.been.calledWith('CalEventMailListener : Missing configuration in mongoDB, fallback to default james:events');
          expect(messagingMock.pointToPoint.get).to.have.been.calledWith(defaultExchange);
          expect(receive).to.have.been.calledWith(sinon.match.func);

          done();
        })
        .catch(function(err) {
          done(err || 'Err');
        });
    };
  });

  describe('the init and subscribe functions', function() {
    it('should call esnConfig when initialize the listener', function(done) {
      getConfig = sinon.stub().returns(Promise.resolve());

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
      getConfig = sinon.stub().returns(Promise.resolve());

      this.checksIfNoMongoConfiguration(done);
    });

    it('should log a warning message and subscribe with the default exchange if mongoDB configuration does not contain the exchanges', function(done) {
      getConfig = sinon.stub().returns(Promise.resolve({}));

      this.checksIfNoMongoConfiguration(done);
    });

    it('should log a warning message and subscribe function with the default exchange if mongoDB configuration contains an empty array for the exchanges field', function(done) {
      moduleConfig = {
        exchanges: []
      };

      getConfig = sinon.stub().returns(Promise.resolve(moduleConfig));

      this.checksIfNoMongoConfiguration(done);
    });

    it('should call the subscribe function with the right exchange from the mongoDB configuration', function(done) {
      this.requireModule()
        .init()
        .then(function() {

          expect(receive).to.have.been.calledTwice;

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
          processMessageFunction = receive.firstCall.args[0];
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
          processMessageFunction = receive.firstCall.args[0];
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
          processMessageFunction = receive.firstCall.args[0];
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
          processMessageFunction = receive.firstCall.args[0];
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

      const context = {
        ack: sinon.stub().returns(Promise.resolve())
      };

      this.requireModule()
        .init()
        .then(function() {
          processMessageFunction = receive.firstCall.args[0];
          processMessageFunction(jsonMessage, context);

          setTimeout(function() {
            expect(caldavClientMock.iTipRequest).to.not.have.been.called;
            expect(context.ack).to.have.been.calledOnce;

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

      const context = {
        ack: sinon.stub().returns(Promise.resolve())
      };

      this.requireModule()
        .init()
        .then(function() {
          processMessageFunction = receive.firstCall.args[0];
          processMessageFunction(jsonMessage, context);

          expect(context.ack).to.not.have.been.called;
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
      const context = {
        ack: sinon.stub().returns(Promise.resolve())
      };

      this.requireModule()
        .init()
        .then(function() {
          processMessageFunction = receive.firstCall.args[0];
          processMessageFunction(jsonMessage, context);

          expect(caldavClientMock.iTipRequest).to.have.been.calledWith('userId', jsonMessage);

          setTimeout(function() {
            expect(context.ack).to.have.been.calledOnce;

            done();
          });
        })
        .catch(function(err) {
          done(err || 'Err');
        });
    });
  });
});
