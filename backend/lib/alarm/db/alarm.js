const STATE = require('../../constants').ALARM.STATE;

module.exports = dependencies => {
  const mongoose = dependencies('db').mongo.mongoose;

    const CalendarAlarmSchema = new mongoose.Schema({
      action: {type: String, required: true},
      attendee: {type: String, required: true},
      eventPath: {type: String, required: true},
      eventUid: {type: String, required: true},
      dueDate: {type: Date, required: true},
      ics: {type: String, required: true},
      state: {type: String, default: STATE.WAITING},
      details: {type: String},
      timestamps: {
        creation: {type: Date, default: Date.now},
        updatedAt: {type: Date}
      },
      context: mongoose.Schema.Types.Mixed
    });

    return mongoose.model('CalendarAlarm', CalendarAlarmSchema);
};
