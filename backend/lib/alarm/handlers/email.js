const emailTemplateName = 'event.alarm';
const Q = require('q');
const CONSTANTS = require('../../constants');

module.exports = dependencies => {
  const logger = dependencies('logger');
  const userModule = dependencies('user');
  const jcalHelper = require('../../helpers/jcal');
  const i18nHelper = require('../../helpers/i18n')(dependencies);
  const emailModule = require('../../email')(dependencies);

  return {
    uniqueId: 'linagora.esn.calendar.alarm.email',
    action: CONSTANTS.VALARM_ACTIONS.EMAIL,
    handle
  };

  function handle({ ics, attendee, eventPath }) {
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
        phrase: 'Notification: {{summary}}',
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
        throw err;
      });
  }
};
