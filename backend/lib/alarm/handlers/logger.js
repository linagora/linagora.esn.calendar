const CONSTANTS = require('../../constants');

module.exports = dependencies => {
  const logger = dependencies('logger');

  return {
    uniqueId: 'linagora.esn.calendar.alarm.logger',
    action: CONSTANTS.VALARM_ACTIONS.EMAIL,
    handle
  };

  function handle(alarm) {
    logger.info(`linagora.esn.calendar.alarm.logger ${alarm.eventPath} - I am a simple alarm logger for debug purpose...`);

    return new Promise(resolve => {
      setTimeout(() => {
        logger.info(`linagora.esn.calendar.alarm.logger ${alarm.eventPath} - I am done`);
        resolve({status: 'ok'});
      }, 5000);
    });
  }
};
