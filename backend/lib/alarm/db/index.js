const CONSTANTS = require('../../constants');

module.exports = dependencies => {
  const logger = dependencies('logger');

  let CalendarAlarm;

  try {
    const mongoose = dependencies('db').mongo.mongoose;

    CalendarAlarm = mongoose.model('CalendarAlarm');
  } catch (err) {
    logger.info('calendar:alarm:db - CalendarAlarm model is not registered. Let register it.', err);
    CalendarAlarm = require('./alarm')(dependencies);
  }

  return {
    CalendarAlarm,
    findById,
    create,
    getAlarmsToHandle,
    remove,
    setState
  };

  function findById(id) {
    return CalendarAlarm.findById(id).exec();
  }

  function create(alarm) {
    return new CalendarAlarm(alarm).save();
  }

  function remove(query) {
    return CalendarAlarm.remove(query).exec();
  }

  function setState(alarm, state, details) {
    alarm.set({state});
    if (details) {
      alarm.set({details});
    }

    return alarm.save();
  }

  function getAlarmsToHandle() {
    return CalendarAlarm.find({
      state: CONSTANTS.ALARM.STATE.WAITING,
      dueDate: { $lte: new Date() }
    }).exec();
  }
};
