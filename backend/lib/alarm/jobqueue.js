module.exports = function(dependencies) {
  const jobQueue = dependencies('jobqueue');
  const logger = dependencies('logger');

  return {
    createWorker,
    enqueue
  };

  function createWorker(handler) {
    jobQueue.lib.workers.add({
      name: getWorkerName(handler),
      getWorkerFunction: () => alarm => handler.handle(alarm)
    });
  }

  function enqueue(alarm, handler) {
    // do not return the submitJob promise since it is only used to track completion of the job itself, not about the submission
    jobQueue.lib.submitJob(getWorkerName(handler), getUniqueJobName(alarm, handler), alarm)
      .then(() => logger.info(`calendar:alarm:job ${alarm._id}::${alarm.eventPath} - The alarm has been processed by handler ${handler.uniqueId}`))
      .catch(err => logger.error(`calendar:alarm:job ${alarm._id}::${alarm.eventPath} - The alarm processed by handler ${handler.uniqueId} failed`, err));
  }

  function getWorkerName(handler) {
    return `linagora.esn.calendar::${handler.uniqueId}::${handler.action}`;
  }

  function getUniqueJobName(alarm, handler) {
    return `${getWorkerName(handler)}-${alarm.id}-${alarm.eventPath}`;
  }
};
