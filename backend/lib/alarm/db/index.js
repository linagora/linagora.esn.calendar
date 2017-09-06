module.exports = dependencies => {
  const Alarm = require('./alarm')(dependencies);

  return {
    Alarm,
    create,
    remove
  };

  function create(alarm) {
    return new Alarm(alarm).save();
  }

  function remove(query) {
    return Alarm.remove(query).exec();
  }
};
