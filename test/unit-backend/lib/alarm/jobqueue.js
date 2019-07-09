const { expect } = require('chai');
const sinon = require('sinon');

describe('The alarm jobqueue', function() {
  let getModule;
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
        addWorker: sinon.spy(),
        submitJob: sinon.stub().returns(Promise.resolve())
      }
    };

    this.moduleHelpers.addDep('jobqueue', jobQueue);

    getModule = () => require(`${this.calendarModulePath}/backend/lib/alarm/jobqueue`)(this.moduleHelpers.dependencies);
  });

  describe('The createWorker function', function() {
    it('should add a new worker to the job queue', function() {
      getModule().createWorker(handler);

      expect(jobQueue.lib.addWorker).to.have.been.calledWith({
        name: sinon.match.string,
        handler: {
          handle: sinon.match.func,
          getTitle: sinon.match.func
        }
      });

      jobQueue.lib.addWorker.firstCall.args[0].handler.handle({ data: { alarm } });

      expect(handler.handle).to.have.been.calledWith(alarm);
    });
  });

  describe('The enqueue function', function() {
    it('should resolve if failed to submit a job in the jobqueue', function(done) {
      jobQueue.lib.submitJob = sinon.stub().returns(Promise.reject());

      getModule().enqueue(alarm, handler)
        .then(() => {
          expect(jobQueue.lib.submitJob).to.have.been.calledWith(
            sinon.match(/linagora.esn.calendar::/),
            { alarm }
          );
          done();
        })
        .catch(err => done(err || 'should resolve'));
    });

    it('should resolve if success to submit a job in the jobqueue', function(done) {
      getModule().enqueue(alarm, handler)
        .then(() => {
          expect(jobQueue.lib.submitJob).to.have.been.calledWith(
            sinon.match(/linagora.esn.calendar::/),
            { alarm }
          );
          done();
        })
        .catch(err => done(err || 'should resolve'));
    });
  });
});
