'use strict';

const moment = require('moment');

module.exports = () => (when, locale) => {
  const start = moment().locale(locale),
        matches = when.match(/(?:(next)\s)?(today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\sat\s?(\d+)(?::(\d+))?\s?(am|pm)?/);

  if (!matches) {
    return start;
  }

  const nextWeek = !!matches[1],
        day = matches[2],
        hour = +matches[3] + (matches[5] === 'pm' ? 12 : 0),
        minute = matches[4] || 0,
        weekdays = {
          today: start.weekday(),
          tonight: start.weekday(),
          tomorrow: start.weekday() + 1,
          sunday: 0,
          monday: 1,
          tuesday: 2,
          wednesday: 3,
          thursday: 4,
          friday: 5,
          saturday: 6
        };

  return start
    .weekday(weekdays[day])
    .add(nextWeek ? 1 : 0, 'week')
    .hour(hour)
    .minute(minute)
    .second(0)
    .millisecond(0)
    .utc();
};
