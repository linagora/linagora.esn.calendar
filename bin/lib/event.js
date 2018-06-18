const ICAL = require('@linagora/ical.js');
const _ = require('lodash');
const Chance = require('chance');
const moment = require('moment');
const uuidV4 = require('uuid/v4');
const { db } = require('./constants');

module.exports = {
  asICAL,
  generateFakeEvents
};

function asICAL({ location, summary, start, duration = 1, attendees = 0 }) {
  const vCalendar = new ICAL.Component(['vcalendar', [], []]);
  const vEvent = new ICAL.Component('vevent');
  const event = new ICAL.Event(vEvent);

  event.uid = uuidV4();
  event.summary = summary;
  event.location = location;
  event.startDate = ICAL.Time.fromJSDate(start.toDate(), true);
  event.endDate = ICAL.Time.fromJSDate(start.add(duration, 'hour').toDate(), true);

  for (let index = 0; index < attendees; index++) {
    const attendee = vEvent.addPropertyWithValue('attendee', `MAILTO:user${index}@open-paas.org`);

    attendee.setParameter('partstat', 'NEEDS-ACTION');
    attendee.setParameter('rsvp', 'true');
    attendee.setParameter('cn', `John Doe ${index}`);
  }

  vCalendar.addSubcomponent(vEvent);

  vEvent.addPropertyWithValue('organizer', 'MAILTO:organizer@open-paas.org').setParameter('cn', 'I am the boss');

  return vCalendar;
}

function generateFakeEvents({ size, weeks = 0 }) {
  const chance = new Chance();
  const events = Array(size).fill(0).map(() => Object.assign({}, db.events[_.random(0, db.events.length - 1)]));

  events.forEach(event => {
    const start = moment().startOf('isoweek');

    start.add(_.random(0, weeks), 'week');
    start.add(_.random(4), 'day');
    start.hour(event.start ? event.start + _.random(1) : _.random(8, 20));
    event.start = start.startOf('hour');
    event.duration = event.duration || _.random(1, 2);
    event.summary = _.random(1) ? event.title : `${event.title} with ${chance.name()}`;
  });

  return events;
}
