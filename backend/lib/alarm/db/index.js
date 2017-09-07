const CONSTANTS = require('../../constants');

module.exports = dependencies => {
  const Alarm = require('./alarm')(dependencies);

  return {
    Alarm,
    create,
    getAlarmsToHandle,
    remove,
    setState
  };

  function create(alarm) {
    return new Alarm(alarm).save();
  }

  function remove(query) {
    return Alarm.remove(query).exec();
  }

  function setState(alarm, state, details) {
    alarm.set({state});
    if (details) {
      alarm.set({details});
    }

    return alarm.save();
  }

  function getAlarmsToHandle() {
    return Alarm.find({
      state: CONSTANTS.ALARM.STATE.WAITING,
      dueDate: { $lte: new Date() }
    }).exec();
  }
};
