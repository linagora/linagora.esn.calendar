const ICAL = require('ical.js');
const _ = require('lodash');
const moment = require('moment');
const uuid = require('node-uuid');
const {db} = require('./constants');

module.exports = {
  asICAL,
  generateFakeEvents
};

function asICAL({location, summary, start, duration = 1}) {
  const vCalendar = new ICAL.Component(['vcalendar', [], []]);
  const vEvent = new ICAL.Component('vevent');
  const event = new ICAL.Event(vEvent);

  event.uid = uuid.v4();
  event.summary = summary;
  event.location = location;
  event.startDate = ICAL.Time.fromJSDate(start.toDate(), true);
  event.endDate = ICAL.Time.fromJSDate(start.add(duration, 'hour').toDate(), true);

  vCalendar.addSubcomponent(vEvent);

  return vCalendar;
}

function generateFakeEvents({nb, weeks = 0}) {
  const events = Array(nb).fill(0).map(() => Object.assign({}, db.events[_.random(0, db.events.length - 1)]));

  events.forEach(event => {
    const start = moment().startOf('isoweek');

    start.add(_.random(0, weeks), 'week');
    start.add(_.random(4), 'day');
    start.hour(event.start ? event.start + _.random(1) : _.random(8, 20));
    event.start = start.startOf('hour');
    event.duration = event.duration || _.random(1, 2);
    event.summary = event.title;
  });

  return events;
}
