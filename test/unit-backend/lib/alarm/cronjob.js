const expect = require('chai').expect;
const sinon = require('sinon');
const Q = require('q');
const CONSTANTS = require('../../../../backend/lib/constants');

describe('The Alarm job module', function() {
  let alarms, cron, modelSpy, findSpy;

  beforeEach(function() {
    alarms = [];

    this.calendarModulePath = this.moduleHelpers.modulePath;
    cron = { submit: sinon.spy(), abortAll: sinon.spy() };

    findSpy = sinon.spy(function() {
      return {
        exec: function() {
          return Q.when(alarms);
        }
      };
    });
    const AlarmSpy = {
      find: findSpy
    };

    modelSpy = sinon.spy(function() {
      return AlarmSpy;
    });
    const db = {
      mongo: {
        mongoose: {
          model: modelSpy
        }
      }
    };

    this.moduleHelpers.addDep('cron', cron);
    this.moduleHelpers.addDep('db', db);

    this.requireModule = function(lib = {}) {
      return require(this.calendarModulePath + '/backend/lib/alarm/cronjob')(this.moduleHelpers.dependencies, lib);
    };
  });

  describe('The cron function', function() {
    it('should get all the alarms to run', function(done) {
      this.requireModule().start();

      const cronTask = cron.submit.firstCall.args[2];

      cronTask(err => {
        expect(err).to.not.exists;
        expect(modelSpy).to.have.been.calledWith('CalendarAlarm');
        expect(findSpy).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.WAITING, dueDate: {$lte: sinon.match.date}});
        done();
      });
    });

    it('should run each found alarm and register next alarms', function(done) {
      const emailHandler = sinon.stub().returns(Q.when());
      const notificationHandler = sinon.stub().returns(Q.when());
      const getHandlers = {email: [emailHandler], notification: [notificationHandler]};
      const handlers = {
        get: sinon.spy(function(action) {
          return getHandlers[action];
        })
      };
      const registerNextAlarm = sinon.spy();

      const emailAlarm = {
        action: 'email',
        set: sinon.spy(),
        save: sinon.stub().returns(Q.when())
      };

      const notificationAlarm = {
        action: 'notification',
        set: sinon.spy(),
        save: sinon.stub().returns(Q.when())
      };

      this.requireModule({handlers, registerNextAlarm}).start();

      alarms.push(emailAlarm);
      alarms.push(notificationAlarm);

      const cronTask = cron.submit.firstCall.args[2];

      cronTask(err => {
        expect(err).to.not.exists;
        expect(emailHandler).to.have.been.calledWith(emailAlarm);
        expect(notificationHandler).to.have.been.calledWith(notificationAlarm);
        expect(registerNextAlarm).to.have.been.calledTwice;
        expect(registerNextAlarm).to.have.been.calledWith(emailAlarm);
        expect(registerNextAlarm).to.have.been.calledWith(notificationAlarm);
        expect(emailAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.RUNNING});
        expect(emailAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.DONE});
        expect(notificationAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.RUNNING});
        expect(notificationAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.DONE});
        done();
      });
    });

    it('should not reject when a handler rejects and register next alarms', function(done) {
      const error = new Error('Notification failure');
      const emailHandler = sinon.stub().returns(Q.when());
      const notificationHandler = sinon.stub().returns(Q.reject(error));
      const getHandlers = {email: [emailHandler], notification: [notificationHandler]};
      const handlers = {
        get: function(action) {
          return getHandlers[action];
        }
      };
      const registerNextAlarm = sinon.spy();

      const emailAlarm = {
        action: 'email',
        set: sinon.spy(),
        save: sinon.stub().returns(Q.when())
      };

      const notificationAlarm = {
        action: 'notification',
        set: sinon.spy(),
        save: sinon.stub().returns(Q.when())
      };

      this.requireModule({handlers, registerNextAlarm}).start();

      alarms.push(emailAlarm);
      alarms.push(notificationAlarm);

      const cronTask = cron.submit.firstCall.args[2];

      cronTask(err => {
        expect(err).to.not.exists;
        expect(emailHandler).to.have.been.calledWith(emailAlarm);
        expect(notificationHandler).to.have.been.calledWith(notificationAlarm);
        expect(registerNextAlarm).to.have.been.calledTwice;
        expect(registerNextAlarm).to.have.been.calledWith(emailAlarm);
        expect(registerNextAlarm).to.have.been.calledWith(notificationAlarm);
        expect(emailAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.RUNNING});
        expect(emailAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.DONE});
        expect(notificationAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.RUNNING});
        expect(notificationAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.DONE});
        done();
      });
    });

    it('should set state to error when next alarm can not be registered', function(done) {
      const error = new Error('Can not register the next alarm');
      const emailHandler = sinon.stub().returns(Q.when());
      const getHandlers = {email: [emailHandler]};
      const handlers = {
        get: function(action) {
          return getHandlers[action];
        }
      };
      const registerNextAlarm = sinon.stub().returns(Q.reject(error));
      const emailAlarm = {
        action: 'email',
        set: sinon.spy(),
        save: sinon.stub().returns(Q.when())
      };

      this.requireModule({handlers, registerNextAlarm}).start();

      alarms.push(emailAlarm);

      const cronTask = cron.submit.firstCall.args[2];

      cronTask(err => {
        expect(err).to.not.exists;
        expect(emailHandler).to.have.been.calledWith(emailAlarm);
        expect(registerNextAlarm).to.have.been.calledWith(emailAlarm);
        expect(emailAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.RUNNING});
        expect(emailAlarm.set).to.not.have.been.calledWith({state: CONSTANTS.ALARM.STATE.DONE});
        expect(emailAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.ERROR});
        done();
      });
    });
  });
});
