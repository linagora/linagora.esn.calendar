const CONSTANTS = require('../constants');

module.exports = dependencies => {
  const cron = dependencies('cron');
  const esnConfig = dependencies('esn-config');
  const logger = dependencies('logger');

  return {
    start
  };

  function start(alarmJob) {
    logger.info('calendar:alarm:cronjob - Starting the alarm cronjob');

    return getCronExpression()
      .then(cronExpression => createCronJob(cronExpression, alarmJob))
      .catch(err => {
        logger.error('calendar:alarm:cronjob - Can not submit the alarm cronjob', err);
        throw err;
      });
  }

  function getCronExpression() {
    return esnConfig('alarm-cron-expression').inModule('linagora.esn.calendar').get()
      .then(value => value || CONSTANTS.ALARM.DEFAULT_CRON_EXPRESSION)
      .catch(err => {
        logger.warn(`calendar:alarm:cronjob - Can not get cron expression from configuration, default to ${CONSTANTS.ALARM.DEFAULT_CRON_EXPRESSION}`, err);

        return CONSTANTS.ALARM.DEFAULT_CRON_EXPRESSION;
      });
  }

  function createCronJob(cronExpression, cronJob) {
    return new Promise((resolve, reject) => {
      cron.submit('Calendar Alarms', cronExpression, cronJob,
      () => {
        logger.info('calendar:alarm:cronjob - Job is complete');
      },
      (err, job) => {
        if (err) {
          logger.error('calendar:alarm:cronjob - Error while submitting the job', err);

          return reject(err);
        }
        logger.info('calendar:alarm:cronjob - Job has been submitted', job);
        resolve(job);
      });
    });
  }
};
