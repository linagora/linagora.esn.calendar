// code the handler which will send email
// the handler does not deal with document state. it is just here to send email and return result

const CONSTANTS = require('../../constants');
const DATE_FORMAT = 'MM-DD-YYYY';
const path = require('path');
const Q = require('q');
const _ = require('lodash');
const moment = require('moment-timezone');
const jcalHelper = require('../../helpers/jcal');
const parseEventPath = require('../../helpers/event').parseEventPath;
const template = { name: 'event.alarm', path: path.resolve(__dirname, '../../../../templates/email') };

module.exports = dependencies => {
  const helpers = dependencies('helpers');
  const emailModule = dependencies('email');
  const logger = dependencies('logger');
  const userModule = dependencies('user');
  const i18nLib = require('../../i18n')(dependencies);

  return { action: CONSTANTS.VALARM_ACTIONS.EMAIL, handle };

  function handle(alarm) {
    const { ics, attendee, eventPath } = alarm;
    const parsedEventPath = parseEventPath(eventPath);

    return Q.nfbind(userModule.findByEmail)(attendee)
      .then(user => {
        if (!user) {
          throw new Error(`User can not be found from email ${attendee}`);
        }

        return user;
      })
      .then(user => Q.all([
        Q.nfcall(helpers.config.getBaseUrl, null),
        i18nLib.getI18nForMailer(user)
      ]))
    .spread((baseUrl, i18nConf) => {
      const event = jcalHelper.jcal2content(ics, baseUrl);
      const alarm = event.alarm;
      const message = {
        to: attendee,
        subject: event.alarm.summary
      };
      const dateEvent = (event.start.timezone ?
          moment(event.start.date, DATE_FORMAT).tz(event.start.timezone) :
          moment(event.start.date, DATE_FORMAT)).format(DATE_FORMAT);

      const seeInCalendarLink = _.template('<%= baseUrl %>/#/calendar?start=<%= formatedDate %>')({
        baseUrl: baseUrl,
        formatedDate: dateEvent
      });
      const consultLink = _.template('<%= baseUrl %>/#/calendar/<%= calendarId %>/event/<%= eventUid %>/consult')({
        baseUrl: baseUrl,
        calendarId: parsedEventPath.calendarId,
        eventUid: parsedEventPath.eventUid
      });

      return emailModule.getMailer().sendHTML(message, template, {
        content: {
          baseUrl: baseUrl,
          event: event,
          alarm: alarm,
          seeInCalendarLink: seeInCalendarLink,
          consultLink: consultLink
        },
        translate: i18nConf.translate
      });
    }).catch(err => {
      logger.error('Can not send alarm email', err);
      throw err;
    });
  }
};
