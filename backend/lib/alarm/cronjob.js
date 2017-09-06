const Q = require('q');
const CONSTANTS = require('../constants');

module.exports = (dependencies, lib) => {

  const cron = dependencies('cron');
  const esnConfig = dependencies('esn-config');
  const logger = dependencies('logger');
  const mongoose = dependencies('db').mongo.mongoose;
  const Alarm = mongoose.model('CalendarAlarm');

  return {
    start
  };

  function start() {
    logger.info('calendar:alarm:job - Starting the alarm job');

    return getCronExpression()
      .then(submitJob)
      .catch(err => {
        logger.error('calendar:alarm:run - Can not submit the alarm job', err);
        throw err;
      });
  }

  function cronJob(callback) {
    return getAlarmsToHandle()
      .then(runAlarms)
      .then(result => callback(null, result))
      .catch(callback);
  }

  function getAlarmsToHandle() {
    return Alarm.find({
      state: CONSTANTS.ALARM.STATE.WAITING,
      dueDate: { $lte: new Date() }
    }).exec();
  }

  function getCronExpression() {
    return esnConfig('alarm-cron-expression').inModule('linagora.esn.calendar').get()
      .then(value => value || CONSTANTS.ALARM.DEFAULT_CRON_EXPRESSION)
      .catch(err => {
        logger.warn(`calendar:alarm:run - Can not get cron expression from configuration, default to ${CONSTANTS.ALARM.DEFAULT_CRON_EXPRESSION}`, err);

        return CONSTANTS.ALARM.DEFAULT_CRON_EXPRESSION;
      });
  }

  function runAlarms(alarms) {
    logger.debug('calendar:alarm:run - Running alarms', alarms);

    return Q.allSettled(alarms.map(runAlarm));
  }

  function runAlarm(alarm) {
    logger.info(`calendar:alarm:run ${alarm.eventPath} - Start to run...`);

    return updateAlarmState(alarm, CONSTANTS.ALARM.STATE.RUNNING)
      .then(callAlarmHandlers)
      .then(() => lib.registerNextAlarm(alarm))
      .then(() => updateAlarmState(alarm, CONSTANTS.ALARM.STATE.DONE))
      .then(() => logger.info(`calendar:alarm:run ${alarm.eventPath} - Done`))
      .catch(err => {
        updateAlarmState(alarm, CONSTANTS.ALARM.STATE.ERROR, err.message);
        logger.error(`calendar:alarm:run ${alarm.eventPath} - Error`, err);
        throw err;
      });

    function callAlarmHandlers() {
      const alarmHandlers = lib.handlers.get(alarm.action);

      return Q.allSettled(alarmHandlers.map(callHandler))
        .then(results => {
          logger.debug(`calendar:alarm:run ${alarm.eventPath} - Alarm results`, results);

          return results;
      });

      function callHandler(handler) {
        logger.info(`calendar:alarm:run ${alarm.eventPath} - Running handler for action ${alarm.action}`);

        return handler(alarm)
          .then(result => {
            logger.debug(`calendar:alarm:run ${alarm.eventPath} - Alarm has been processed`, result);

            return result;
          })
          .catch(err => {
            logger.error(`calendar:alarm:run ${alarm.eventPath} - Error while running the alarm handler for action ${alarm.action}`, err);
            throw err;
          });
      }
    }
  }

  function submitJob(cronExpression) {
    const defer = Q.defer();

    cron.submit('Calendar Alarms', cronExpression, cronJob,
      () => {
        logger.info('calendar:alarm:job - Job is complete');
      },
      (err, job) => {
        if (err) {
          logger.error('calendar:alarm:job - Error while submitting the job', err);

          return defer.reject(err);
        }
        logger.info('calendar:alarm:job - Job has been submitted', job);
        defer.resolve(job);
      }
    );

    return defer.promise;
  }

  function updateAlarmState(alarm, state, details) {
    alarm.set({state});
    if (details) {
      alarm.set({details});
    }

    return alarm.save();
  }
};
