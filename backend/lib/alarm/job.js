module.exports = function(dependencies) {
  const jobQueue = dependencies('jobqueue');
  const logger = dependencies('logger');

  return {
    createJobWorker,
    enqueue
  };

  function createJobWorker(handler) {
    jobQueue.lib.workers.add({
      name: getWorkerName(handler),
      getWorkerFunction: function() {
        return function(data) {
          logger.debug(`Getting worker function for ${handler.action} and data `, data);

          return handler.handle(data.alarm);
        };
      }
    });
  }

  function enqueue(alarm, handler) {
    return jobQueue.lib.submitJob(getWorkerName(handler), getUniqueJobName(alarm, handler), {alarm, locked: true});
  }

  function getWorkerName(handler) {
    return `calendar-alarm-${handler.uniqueId}`;
  }

  function getUniqueJobName(alarm, handler) {
    return `${getWorkerName(handler)}-${alarm.id}-${alarm.eventPath}`;
  }
};
