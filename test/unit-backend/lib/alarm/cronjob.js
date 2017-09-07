const expect = require('chai').expect;
const sinon = require('sinon');
const CONSTANTS = require('../../../../backend/lib/constants');

describe('The Alarm job module', function() {
  let alarms, cron, esnConfig, modelSpy, findSpy, getConfig, CRON_EXPRESSION;

  beforeEach(function() {
    CRON_EXPRESSION = 'each minute';
    alarms = [];

    this.calendarModulePath = this.moduleHelpers.modulePath;
    cron = {
      submit: sinon.spy(function(name, cronExpression, cronJob, onComplete, callback) {
        callback();
      }),
      abortAll: sinon.spy()
    };

    findSpy = sinon.spy(function() {
      return {
        exec: function() {
          return Promise.resolve(alarms);
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

    getConfig = sinon.stub().returns(Promise.resolve(CRON_EXPRESSION));
    esnConfig = function() {
      return {
        inModule: function() {
          return {
            get: getConfig
          };
        }
      };
    };

    this.moduleHelpers.addDep('esn-config', esnConfig);
    this.moduleHelpers.addDep('cron', cron);
    this.moduleHelpers.addDep('db', db);

    this.requireModule = function(lib = {}) {
      return require(this.calendarModulePath + '/backend/lib/alarm/cronjob')(this.moduleHelpers.dependencies, lib);
    };
  });

  describe('The start function', function() {
    it('should submit job with default cron expression when not found in configuration', function(done) {
      getConfig.returns(Promise.resolve());

      this.requireModule().start().then(test, done);

      function test() {
        expect(getConfig).to.have.been.called;
        expect(cron.submit.firstCall.args[1]).to.equal(CONSTANTS.ALARM.DEFAULT_CRON_EXPRESSION);
        done();
      }
    });

    it('should submit job with default cron expression when config retrieval fails', function(done) {
      getConfig.returns(Promise.reject(new Error('I failed')));
      this.requireModule().start().then(test, done);

      function test() {
        expect(getConfig).to.have.been.called;
        expect(cron.submit.firstCall.args[1]).to.equal(CONSTANTS.ALARM.DEFAULT_CRON_EXPRESSION);
        done();
      }
    });

    it('should submit the job with the configured expression', function(done) {
      const myCron = 'My own cron';

      getConfig.returns(Promise.resolve(myCron));
      this.requireModule().start().then(test, done);

      function test() {
        expect(getConfig).to.have.been.called;
        expect(cron.submit.firstCall.args[1]).to.equal(myCron);
        done();
      }
    });

    it('should reject when the job can not be submitted', function(done) {
      const error = new Error('I failed to submit the job');

      cron.submit = sinon.spy(function(name, cronExpression, cronJob, onComplete, callback) {
        callback(error);
      });

      this.requireModule().start().then(() => done(new Error('Should not occur')), test);

      function test(err) {
        expect(err).to.equal(error);
        expect(getConfig).to.have.been.called;
        done();
      }
    });
  });

  describe('The cron function', function() {
    it('should get all the alarms to run', function(done) {
      this.requireModule().start().then(test, done);

      function test() {
        const cronTask = cron.submit.firstCall.args[2];

        cronTask(err => {
          expect(err).to.not.exists;
          expect(modelSpy).to.have.been.calledWith('CalendarAlarm');
          expect(findSpy).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.WAITING, dueDate: {$lte: sinon.match.date}});
          done();
        });
      }
    });

    it('should run each found alarm and register next alarms', function(done) {
      const emailHandler = {handle: sinon.stub().returns(Promise.resolve())};
      const notificationHandler = {handle: sinon.stub().returns(Promise.resolve())};
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
        save: sinon.stub().returns(Promise.resolve())
      };

      const notificationAlarm = {
        action: 'notification',
        set: sinon.spy(),
        save: sinon.stub().returns(Promise.resolve())
      };

      this.requireModule({handlers, registerNextAlarm}).start().then(test, done);

      function test() {
        alarms.push(emailAlarm);
        alarms.push(notificationAlarm);

        const cronTask = cron.submit.firstCall.args[2];

        cronTask(err => {
          expect(err).to.not.exists;
          expect(emailHandler.handle).to.have.been.calledWith(emailAlarm);
          expect(notificationHandler.handle).to.have.been.calledWith(notificationAlarm);
          expect(registerNextAlarm).to.have.been.calledTwice;
          expect(registerNextAlarm).to.have.been.calledWith(emailAlarm);
          expect(registerNextAlarm).to.have.been.calledWith(notificationAlarm);
          expect(emailAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.RUNNING});
          expect(emailAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.DONE});
          expect(notificationAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.RUNNING});
          expect(notificationAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.DONE});
          done();
        });
      }
    });

    it('should not reject when a handler rejects and register next alarms', function(done) {
      const error = new Error('Notification failure');
      const emailHandler = {handle: sinon.stub().returns(Promise.resolve())};
      const notificationHandler = {handle: sinon.stub().returns(Promise.reject(error))};
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
        save: sinon.stub().returns(Promise.resolve())
      };

      const notificationAlarm = {
        action: 'notification',
        set: sinon.spy(),
        save: sinon.stub().returns(Promise.resolve())
      };

      this.requireModule({handlers, registerNextAlarm}).start().then(test, done);

      function test() {
        alarms.push(emailAlarm);
        alarms.push(notificationAlarm);

        const cronTask = cron.submit.firstCall.args[2];

        cronTask(err => {
          expect(err).to.not.exists;
          expect(emailHandler.handle).to.have.been.calledWith(emailAlarm);
          expect(notificationHandler.handle).to.have.been.calledWith(notificationAlarm);
          expect(registerNextAlarm).to.have.been.calledTwice;
          expect(registerNextAlarm).to.have.been.calledWith(emailAlarm);
          expect(registerNextAlarm).to.have.been.calledWith(notificationAlarm);
          expect(emailAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.RUNNING});
          expect(emailAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.DONE});
          expect(notificationAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.RUNNING});
          expect(notificationAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.DONE});
          done();
        });
      }
    });

    it('should set state to error when next alarm can not be registered', function(done) {
      const error = new Error('Can not register the next alarm');
      const emailHandler = {handle: sinon.stub().returns(Promise.resolve())};
      const getHandlers = {email: [emailHandler]};
      const handlers = {
        get: function(action) {
          return getHandlers[action];
        }
      };
      const registerNextAlarm = sinon.stub().returns(Promise.reject(error));
      const emailAlarm = {
        action: 'email',
        set: sinon.spy(),
        save: sinon.stub().returns(Promise.resolve())
      };

      this.requireModule({handlers, registerNextAlarm}).start().then(test, done);

      function test() {
        alarms.push(emailAlarm);

        const cronTask = cron.submit.firstCall.args[2];

        cronTask(err => {
          expect(err).to.not.exists;
          expect(emailHandler.handle).to.have.been.calledWith(emailAlarm);
          expect(registerNextAlarm).to.have.been.calledWith(emailAlarm);
          expect(emailAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.RUNNING});
          expect(emailAlarm.set).to.not.have.been.calledWith({state: CONSTANTS.ALARM.STATE.DONE});
          expect(emailAlarm.set).to.have.been.calledWith({state: CONSTANTS.ALARM.STATE.ERROR});
          done();
        });
      }
    });
  });
});
