const Q = require('q');
const CONSTANTS = require('../constants');
const CRON_EXPRESSION = '*/10 * * * * *';

module.exports = (dependencies, lib) => {

  const cron = dependencies('cron');
  const logger = dependencies('logger');
  const mongoose = dependencies('db').mongo.mongoose;
  const Alarm = mongoose.model('CalendarAlarm');

  return {
    start
  };

  function start() {
    logger.info('calendar:alarm - Starting the alarm job');
    cron.submit('Calendar Alarms', CRON_EXPRESSION, cronJob, () => {
      logger.info('Job is complete');
      },
      (err, job) => {
        if (err) {
          logger.error('Error while submitting the alarm job', err);
        }
        logger.info('Alarm Job has been submitted', job);
      }
    );
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

  function updateAlarmState(alarm, state, details) {
    alarm.set({state});
    if (details) {
      alarm.set({details});
    }

    return alarm.save();
  }
};
