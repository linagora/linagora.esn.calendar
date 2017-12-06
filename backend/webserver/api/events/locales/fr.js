'use strict';

const moment = require('moment');

module.exports = () => (when, locale) => {
  const start = moment().locale(locale),
        matches = when.match(/(aujourdhui|ce soir|demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s(?:(prochain)\s)?[aà]\s?(\d+)h\s?(\d+)?/);

  if (!matches) {
    return start;
  }

  const day = matches[1],
        nextWeek = !!matches[2],
        hour = matches[3],
        minute = matches[4] || 0,
        weekdays = {
          aujourdhui: start.weekday(),
          'ce soir': start.weekday(),
          demain: start.weekday() + 1,
          lundi: 0,
          mardi: 1,
          mercredi: 2,
          jeudi: 3,
          vendredi: 4,
          samedi: 5,
          dimanche: 6
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
