const {expect} = require('chai');
const sinon = require('sinon');

describe('The alarm jobqueue', function() {
  let jobQueue, handler, uniqueId, action, alarm, id, eventPath;

  beforeEach(function() {
    this.calendarModulePath = this.moduleHelpers.modulePath;
    uniqueId = '123';
    action = 'EMAIL';
    id = 'alarmId';
    eventPath = 'event/path.ics';

    handler = {
      uniqueId,
      action,
      handle: sinon.stub().returns(Promise.resolve())
    };

    alarm = {
      id,
      eventPath
    };

    jobQueue = {
      lib: {
        workers: {
          add: sinon.spy()
        },
        submitJob: sinon.stub().returns(Promise.resolve())
      }
    };

    this.moduleHelpers.addDep('jobqueue', jobQueue);

    this.requireModule = () => require(this.calendarModulePath + '/backend/lib/alarm/jobqueue')(this.moduleHelpers.dependencies);
  });

  describe('The createWorker function', function() {
    it('should add a new worker to the job queue', function() {
      this.requireModule().createWorker(handler);

      expect(jobQueue.lib.workers.add).to.have.been.calledWith({
        name: sinon.match.string,
        getWorkerFunction: sinon.match.func
      });

      jobQueue.lib.workers.add.firstCall.args[0].getWorkerFunction()(alarm);

      expect(handler.handle).to.have.been.calledWith(alarm);
    });
  });

  describe('The enqueue function', function() {
    it('submit a job in the jobqueue', function() {
      this.requireModule().enqueue(alarm, handler);

      expect(jobQueue.lib.submitJob).to.have.been.calledWith(
        sinon.match(/linagora.esn.calendar::/),
        sinon.match(/linagora.esn.calendar::/),
        alarm
      );
    });
  });
});
