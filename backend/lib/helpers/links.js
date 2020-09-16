const Q = require('q');
const _ = require('lodash');
const moment = require('moment-timezone');
const parseEventPath = require('./event').parseEventPath;
const jcalHelper = require('./jcal');
const DATE_FORMAT = 'MM-DD-YYYY';

module.exports = dependencies => {
  const helpers = dependencies('helpers');

  return {
    getEventInCalendar,
    getEventDetails
  };

  function getEventDetails(eventPath) {
    const parsedEventPath = parseEventPath(eventPath);

    return Q.nfcall(helpers.config.getBaseUrl, null)
      .then(baseUrl => _.template('<%= baseUrl %>/calendar/#/calendar/<%= calendarId %>/event/<%= eventUid %>/consult')({
        baseUrl,
        calendarId: parsedEventPath.calendarId,
        eventUid: parsedEventPath.eventUid
    }));
  }

  function getEventInCalendar(ics) {
    const event = jcalHelper.jcal2content(ics);
    const dateEvent = (event.start.timezone ?
      moment(event.start.date, DATE_FORMAT).tz(event.start.timezone) :
      moment(event.start.date, DATE_FORMAT)).format(DATE_FORMAT);

    return Q.nfcall(helpers.config.getBaseUrl, null)
      .then(baseUrl => _.template('<%= baseUrl %>/calendar/#/calendar?start=<%= formatedDate %>')({
        baseUrl,
        formatedDate: dateEvent
      }));
  }
};
