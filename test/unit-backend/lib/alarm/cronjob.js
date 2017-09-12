const {expect} = require('chai');
const sinon = require('sinon');
const CONSTANTS = require('../../../../backend/lib/constants');

describe('The Alarm cronjob module', function() {
  let cron, job, esnConfig, getConfig, CRON_EXPRESSION;

  beforeEach(function() {
    CRON_EXPRESSION = 'each minute';
    job = function() {};

    this.calendarModulePath = this.moduleHelpers.modulePath;
    cron = {
      submit: sinon.spy(function(name, cronExpression, cronJob, onComplete, callback) {
        callback();
      }),
      abortAll: sinon.spy()
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

    this.requireModule = () => require(this.calendarModulePath + '/backend/lib/alarm/cronjob')(this.moduleHelpers.dependencies);
  });

  describe('The start function', function() {
    it('should reject if the job is not defined', function(done) {
      this.requireModule().start(job).then(done, err => {
        expect(err.details).to.match(/Job must be defined/);
        done();
      });
    });

    it('should submit job with default cron expression when not found in configuration', function(done) {
      getConfig.returns(Promise.resolve());

      this.requireModule().start(job).then(test, done);

      function test() {
        expect(getConfig).to.have.been.called;
        expect(cron.submit.firstCall.args[1]).to.equal(CONSTANTS.ALARM.DEFAULT_CRON_EXPRESSION);
        done();
      }
    });

    it('should submit job with default cron expression when config retrieval fails', function(done) {
      getConfig.returns(Promise.reject(new Error('I failed')));
      this.requireModule().start(job).then(test, done);

      function test() {
        expect(getConfig).to.have.been.called;
        expect(cron.submit.firstCall.args[1]).to.equal(CONSTANTS.ALARM.DEFAULT_CRON_EXPRESSION);
        done();
      }
    });

    it('should submit the job with the configured expression', function(done) {
      const myCron = 'My own cron';

      getConfig.returns(Promise.resolve(myCron));
      this.requireModule().start(job).then(test, done);

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

      this.requireModule().start(job).then(() => done(new Error('Should not occur')), test);

      function test(err) {
        expect(err).to.equal(error);
        expect(getConfig).to.have.been.called;
        done();
      }
    });
  });
});
