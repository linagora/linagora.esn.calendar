module.exports = function(dependencies) {
  const jobQueue = dependencies('jobqueue');
  const logger = dependencies('logger');

  return {
    createWorker,
    enqueue
  };

  function createWorker(handler) {
    jobQueue.lib.addWorker({
      name: getWorkerName(handler),
      handler: {
        handle: job => handler.handle(job.data.alarm),
        getTitle: jobData => getUniqueJobName(jobData.alarm, handler)
      }
    });
  }

  function enqueue(alarm, handler) {
    return jobQueue.lib.submitJob(getWorkerName(handler), { alarm })
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
