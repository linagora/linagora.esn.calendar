const CONSTANTS = require('../../constants');

module.exports = dependencies => {
  const CalendarAlarm = require('./alarm')(dependencies);

  return {
    CalendarAlarm,
    create,
    getAlarmsToHandle,
    remove,
    setState
  };

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
