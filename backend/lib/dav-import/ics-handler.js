const ICAL = require('@linagora/ical.js');
const { jcal } = require('../helpers');
const q = require('q');

const CONTENT_TYPE = 'text/calendar';
const START_LINE = /^BEGIN:VEVENT\r?$/;
const END_LINE = /^END:VEVENT\r?$/;

module.exports = function(dependencies) {
  const logger = dependencies('logger');
  const client = require('../caldav-client')(dependencies);

  return {
    contentType: CONTENT_TYPE,
    readLines,
    targetValidator,
    importItem
  };

  function readLines(lines, remainingLines) {
    const items = [];
    let readingLines = remainingLines ? remainingLines.slice() : [];

    lines.forEach(line => {
      // skip until the start line
      if (readingLines.length === 0 && !START_LINE.test(line)) {
        return;
      }

      readingLines.push(line);

      if (END_LINE.test(line)) {
        items.push(readingLines.join('\n'));
        readingLines = [];
      }
    });

    return {
      items,
      remainingLines: readingLines
    };
  }

  function targetValidator(user, target) {
    const [,, userId, calendarId] = target.split('/');

    return userId === user._id.toString() && !!calendarId;
  }

  function importItem(item, { target, user }) {
    const [,,, calendarId] = target.split('/');
    const calendarUri = calendarId ? calendarId.replace('.json', '') : '';

    if (!calendarUri) {
      return q.reject(new Error(`${target} is not a valid calendar path`));
    }

    const vevent = jcal.icsAsVcalendar(item);
    const vCalendar = new ICAL.Component(['vcalendar', [], []]);
    vCalendar.addSubcomponent(vevent);

    const eventId = vevent.getFirstPropertyValue('uid');
    const organizer = jcal.getOrganizerEmail(vCalendar.toJSON());
    const attendees = jcal.getAttendeesEmails(vCalendar.toJSON());

    if (organizer !== user.preferredEmail && !attendees.includes(user.preferredEmail)) {
      const eventSummary = vevent.getFirstPropertyValue('summary');

      logger.warn(`The user ${user.preferredEmail} is not organizer or attendee the imported event it will be ignored : ${eventId} - ${eventSummary}`);

      return q.resolve();
    }

    return client.importEvent({id: user._id.toString()}, calendarUri, eventId, vCalendar);
  }
};
