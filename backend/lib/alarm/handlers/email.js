const emailTemplateName = 'event.alarm';
const Q = require('q');
const CONSTANTS = require('../../constants');

module.exports = dependencies => {
  const logger = dependencies('logger');
  const userModule = dependencies('user');
  const jcalHelper = require('../../helpers/jcal');
  const db = require('../db')(dependencies);
  const i18nHelper = require('../../helpers/i18n')(dependencies);
  const emailModule = require('../../email')(dependencies);

  return {
    uniqueId: 'linagora.esn.calendar.alarm.email',
    action: CONSTANTS.VALARM_ACTIONS.EMAIL,
    handle
  };

  function handle({ _id, ics, attendee, eventPath }) {
    let error;
    logger.debug(`Sending alarm by email to ${attendee} for event ${eventPath}`);
    const event = jcalHelper.jcal2content(ics);

    return Q.denodeify(userModule.findByEmail)(attendee)
      .then(user => {
        if (!user) {
          throw new Error(`User can not be found from email ${attendee}`);
        }

        return user;
      })
      .then(user => i18nHelper.getEventSummaryForUser(event.summary, user))
      .then(summary => ({
        phrase: 'Notification: {{{summary}}}',
        parameters: {
          summary
        }
      }))
      .then(subject => emailModule.sender.send({
        to: attendee,
        subject,
        ics,
        eventPath,
        emailTemplateName
      }))
      .catch(err => {
        logger.error('Can not send alarm email', err);
        error = err;
        throw err;
      })
      .finally(() => {
        if (!error) {
          return updateAlarmState(_id, CONSTANTS.ALARM.STATE.DONE);
        }

        return updateAlarmState(_id, CONSTANTS.ALARM.STATE.ERROR);
      });
  }

  function updateAlarmState(id, state) {
    if (!id) {
      logger.error('calendar:alarm:handlers:email - Failed to update alarm status - No Alarm ID');

      return Promise.resolve();
    }

    return db.findById(id)
      .then(alarm => db.setState(alarm, state))
      .catch(err => {
        logger.error('calendar:alarm:handlers:email - Failed to update alarm status', err);
        throw err;
      });
  }
};
