'use strict';

const {expect} = require('chai');
const mockery = require('mockery');
const fs = require('fs');
const sinon = require('sinon');
const ICAL = require('@linagora/ical.js');
const CONSTANTS = require('../../../../backend/lib/constants');

describe('The alarm module', function() {
  let alarms, eventUid, notifyFunctions, amqpClientProviderMock, amqpClient, attendeeEmail, eventPath, alarmDB, jobLib, jobQueue, pubsubMock;

  beforeEach(function() {
    this.calendarModulePath = this.moduleHelpers.modulePath;
    alarms = [];
    attendeeEmail = 'slemaistre@gmail.com';
    eventUid = 'f1514f44bf39311568d640721cbc555071ca90e08d3349ccae43e1787553988ae047feb2aab16e43439a608f28671ab7c10e754cec5324c4e4cd93f443dc3934f6c5d2e592a8112c';
    eventPath = '/calendars/USER/CAL_ID/EVENT_UID.ics';
    notifyFunctions = {};

    jobLib = {
      start: () => {}
    };
    mockery.registerMock('./cronjob', () => jobLib);

    jobQueue = {
      createWorker: sinon.spy(),
      enqueue: sinon.stub().returns(Promise.resolve())
    };
    mockery.registerMock('./jobqueue', () => jobQueue);

    alarmDB = {
      getAlarmsToHandle: sinon.stub().returns(Promise.resolve(alarms)),
      remove: sinon.stub().returns(Promise.resolve()),
      save: sinon.stub().returns(Promise.resolve()),
      create: sinon.stub().returns(Promise.resolve()),
      setState: sinon.stub().returns(Promise.resolve())
    };
    mockery.registerMock('./db', () => alarmDB);

    amqpClient = {
      ack: sinon.spy()
    };

    amqpClientProviderMock = {
      getClient: () => Promise.resolve(amqpClient)
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
        topic: topic => {
          pubsubMock.global.currentTopic = topic;

          return pubsubMock.global;
        },
        subscribe: sinon.spy(notifyFn => {
          notifyFunctions[pubsubMock.global.currentTopic] = notifyFn;
        })
      }
    };

    this.moduleHelpers.addDep('amqpClientProvider', amqpClientProviderMock);
    this.moduleHelpers.addDep('pubsub', pubsubMock);

    mockery.registerMock('./handlers/email', function() {return {handle: function() {}, uniqueId: 'foo.bar.baz', action: 'EMAIL'};});

    this.requireModule = () => require(this.calendarModulePath + '/backend/lib/alarm')(this.moduleHelpers.dependencies);

    this.getICSAsString = name => fs.readFileSync(`${this.calendarModulePath}/test/unit-backend/fixtures/${name}.ics`).toString('utf8');
    this.getEventAsJSON = name => this.getEvent(name).toJSON();
    this.getEvent = name => ICAL.Component.fromString(this.getICSAsString(name));
  });

  function checkAlarmCreated(done) {
    expect(alarmDB.create).to.have.been.calledWith(
      sinon.match(context => {
        expect(context).to.shallowDeepEqual({
          action: 'EMAIL',
          attendee: attendeeEmail,
          eventUid
        });

        return true;
      })
    );

    done && done();
  }

  describe('init function', function() {
    it('should be callable once', function(done) {
      const module = this.requireModule();

      module.init()
        .then(() => {
          expect(module.init).to.throw(/Already initialized/);
          expect(pubsubMock.global.subscribe.callCount).to.equals(5);
          done();
        })
        .catch(done);
    });

    it('should register email handler', function(done) {
      const register = sinon.spy();

      mockery.registerMock('./handlers', () => ({register}));

      this.requireModule().init()
        .then(() => {
          expect(register).to.have.been.calledOnce;
          done();
        })
        .catch(done);
    });

    it('should start the job', function(done) {
      const spy = sinon.spy(jobLib, 'start');

      this.requireModule().init().then(() => {
        expect(spy).to.have.been.calledOnce;
        done();
      }).catch(done);
    });
  });

  describe('on pubsub event', function() {
    describe('on EVENTS.ALARM.DELETED event', function() {
      it('should remove alarms at the given eventPath', function(done) {
        this.requireModule().init()
          .then(test)
          .catch(done);

        function test() {
          return notifyFunctions[CONSTANTS.EVENTS.ALARM.DELETED]({eventPath})
            .then(() => {
              expect(alarmDB.remove).to.have.been.calledWith({eventPath});
              done();
            });
        }
      });

      it('should reject when abort rejects', function(done) {
        const error = new Error('I failed to remove alarms');

        alarmDB.remove = sinon.stub().returns(Promise.reject(error));

        this.requireModule().init().then(test).catch(done);

        function test() {
          return notifyFunctions[CONSTANTS.EVENTS.ALARM.DELETED]({eventPath})
            .then(() => done(new Error('Should not occur')))
            .catch(err => {
              expect(err).to.equal(error);
              expect(alarmDB.remove).to.have.been.calledWith({eventPath});
              done();
            });
        }
      });
    });

    describe('on EVENTS.ALARM.CREATED event', function() {
      it('should register a new alarm without recurring', function(done) {
        const self = this;

        this.requireModule().init().then(test).catch(done);

        function test() {
          return notifyFunctions[CONSTANTS.EVENTS.ALARM.CREATED]({
            eventPath,
            event: self.getEventAsJSON('withVALARM')
          })
          .then(() => checkAlarmCreated(done));
        }
      });

      it('should do nothing if event has no valarm', function(done) {
        const self = this;

        this.requireModule().init().then(test).catch(done);

        function test() {
          return notifyFunctions[CONSTANTS.EVENTS.ALARM.CREATED]({
            eventPath,
            event: self.getEventAsJSON('allday')
          })
          .then(() => {
            expect(alarmDB.create).to.not.have.been.called;
            done();
          });
        }
      });

      it('should register a new alarm with recurring', function(done) {
        const self = this;

        this.requireModule().init().then(test).catch(done);

        function test() {
          return notifyFunctions[CONSTANTS.EVENTS.ALARM.CREATED]({
            eventPath,
            event: self.getEventAsJSON('withVALARMandRRULE')
          }).then(() => {
            expect(alarmDB.create).to.have.been.called.twice;
            checkAlarmCreated(done);
          });
        }
      });

      it('should add as many alarms as there are in the event', function(done) {
        const self = this;

        this.requireModule().init().then(test).catch(done);

        function test() {
          return notifyFunctions[CONSTANTS.EVENTS.ALARM.CREATED]({
            eventPath,
            event: self.getEventAsJSON('with2VALARMs')
          }).then(() => {
            expect(alarmDB.create).to.have.been.called.twice;
            expect(alarmDB.create).to.have.been.calledWithMatch({
              action: 'EMAIL',
              attendee: attendeeEmail,
              eventUid,
              eventPath
            });
            expect(alarmDB.create).to.have.been.calledWithMatch({
              action: 'DISPLAY',
              eventUid,
              eventPath
            });
            done();
          });
        }
      });
    });

    describe('on EVENTS.ALARM.UPDATED event', function() {
      it('should not try to remove alarm for previous event if no alarm was defined and register a new one if defined', function(done) {
        const self = this;

        this.requireModule().init().then(test).catch(done);

        function test() {
          return notifyFunctions[CONSTANTS.EVENTS.ALARM.UPDATED]({
            eventPath,
            event: self.getEventAsJSON('withVALARM'),
            old_event: self.getEventAsJSON('allday')
          }).then(() => {
            expect(alarmDB.remove).to.have.been.calledWith({eventPath, state: CONSTANTS.ALARM.STATE.WAITING});
            checkAlarmCreated();
            done();
          });
        }
      });

      it('should fail if the deletion of previous alarm failed', function(done) {
        const error = new Error('I failed to delete');
        const ics = this.getEventAsJSON('withVALARM');

        alarmDB.remove = sinon.stub().returns(Promise.reject(error));

        this.requireModule().init().then(test, done);

        function test() {
          return notifyFunctions[CONSTANTS.EVENTS.ALARM.UPDATED]({
            eventPath,
            event: ics,
            old_event: ics
          }).then(() => {
            done(new Error('Should not occur'));
          }).catch(err => {
            expect(err).to.equal(error);
            expect(alarmDB.remove).to.have.been.calledWith({ eventPath, state: CONSTANTS.ALARM.STATE.WAITING });
            expect(alarmDB.create).to.not.have.been.called;
            done();
          });
        }
      });

      it('should delete alarm for the event if any and register a new one', function(done) {
        const ics = this.getEventAsJSON('withVALARM');

        this.requireModule().init().then(test).catch(done);

        function test() {
          return notifyFunctions[CONSTANTS.EVENTS.ALARM.UPDATED]({
            eventPath,
            event: ics,
            old_event: ics
          }).then(() => {
            expect(alarmDB.remove).to.have.been.called;
            checkAlarmCreated(done);
          });
        }
      });

      it('should only register an alarm if there is no alarm for the previous version of event with recurring', function(done) {
        const self = this;

        this.requireModule().init().then(test).catch(done);

        function test() {
          return notifyFunctions[CONSTANTS.EVENTS.ALARM.UPDATED]({
            eventPath,
            event: self.getEventAsJSON('withVALARMandRRULE'),
            old_event: self.getEventAsJSON('allday')
          }).then(() => {
            expect(alarmDB.remove).to.have.been.calledWith({ eventPath, state: CONSTANTS.ALARM.STATE.WAITING });
            checkAlarmCreated(done);
          });
        }
      });
    });
  });

  describe('The registerNextAlarm function', function() {
    it('should not register alarm if the event is not recurring', function(done) {
      const alarm = {
        eventPath,
        ics: this.getICSAsString('withVALARM')
      };

      const logger = this.moduleHelpers.dependencies('logger');
      const loggerSpy = sinon.spy(logger, 'debug');

      this.requireModule().registerNextAlarm(alarm)
        .then(() => {
          expect(alarmDB.create).to.not.have.been.called;
          expect(loggerSpy).to.have.been.calledWithMatch(/Event is not recurring, skipping/);
          done();
        })
        .catch(done);
    });

    it('should register the next alarm on recurring event', function(done) {
      const alarm = {
        eventPath,
        ics: this.getICSAsString('withVALARMandRRULE'),
        toJSON: sinon.spy(() => alarm)
      };

      this.requireModule().registerNextAlarm(alarm)
        .then(() => {
          expect(alarmDB.create).to.have.been.called;
          done();
        })
        .catch(done);
    });

    it('should reject if registering alarm fails', function(done) {
      const error = new Error('I failed!');
      const alarm = {
        eventPath,
        ics: this.getICSAsString('withVALARMandRRULE'),
        toJSON: sinon.spy(() => alarm)
      };

      alarmDB.create = sinon.stub().returns(Promise.reject(error));

      this.requireModule().registerNextAlarm(alarm)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err).to.equal(error);
          expect(alarmDB.create).to.have.been.called;
          done();
        });
    });
  });

  describe('The registerAlarmHandler function', function() {
    it('should register the handler and create a worker', function() {
      const handler = 'The Handler';
      const registerSpy = sinon.spy();

      mockery.registerMock('./handlers', () => ({ register: registerSpy }));

      this.requireModule().registerAlarmHandler(handler);

      expect(registerSpy).to.have.been.calledWith(handler);
      expect(jobQueue.createWorker).to.have.been.calledWith(handler);
    });
  });

  describe('The processAlarms function', function() {
    it('should get all the alarms to run', function(done) {
      this.requireModule().processAlarms(err => {
        expect(err).to.not.exists;
        expect(alarmDB.getAlarmsToHandle).to.have.been.calledOnce;
        done();
      });
    });

    it('should enqueue each alarm', function(done) {
      const emailHandler = {handle: sinon.stub().returns(Promise.resolve())};
      const notificationHandler = {handle: sinon.stub().returns(Promise.resolve())};
      const getHandlers = {email: [emailHandler], notification: [notificationHandler]};
      const handlers = {
        getHandlersForAction: sinon.spy(action => getHandlers[action])
      };
      const emailAlarm = {
        action: 'email',
        set: sinon.spy(),
        save: sinon.stub().returns(Promise.resolve())
      };
      const notificationAlarm = {
        action: 'notification',
        set: sinon.spy(),
        save: sinon.stub().returns(Promise.resolve())
      };

      mockery.registerMock('./handlers', () => handlers);

      alarms.push(emailAlarm);
      alarms.push(notificationAlarm);

      this.requireModule().processAlarms(err => {
        expect(err).to.not.exists;
        expect(jobQueue.enqueue).to.have.been.calledWith(emailAlarm, emailHandler);
        expect(jobQueue.enqueue).to.have.been.calledWith(notificationAlarm, notificationHandler);
        expect(alarmDB.setState).to.have.been.calledTwice;
        expect(alarmDB.setState).to.have.been.calledWith(emailAlarm, CONSTANTS.ALARM.STATE.RUNNING);
        expect(alarmDB.setState).to.have.been.calledWith(notificationAlarm, CONSTANTS.ALARM.STATE.RUNNING);
        done();
      });
    });
  });
});
