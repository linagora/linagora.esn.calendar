const util = require('util');
const path = require('path');
const Q = require('q');
const _ = require('lodash');
const jcalHelper = require('../helpers/jcal');
const TEMPLATE_PATH = path.resolve(__dirname, '../../../templates/email');
const ATTACHMENT_NAME = 'meeting.ics';

module.exports = dependencies => {
  const helpers = dependencies('helpers');
  const emailModule = dependencies('email');
  const logger = dependencies('logger');
  const userModule = dependencies('user');
  const i18nLib = require('../i18n')(dependencies);
  const linksHelper = require('../helpers/links')(dependencies);
  const findByEmail = util.promisify(userModule.findByEmail);

  return {
    send
  };

  function send({from, to, subject, ics, eventPath, emailTemplateName, context = {}}) {
    return Q.all([
      Q.nfcall(helpers.config.getBaseUrl, null),
      linksHelper.getEventDetails(eventPath),
      linksHelper.getEventInCalendar(ics)
    ])
    .spread((baseUrl, eventDetailsLink, seeInCalendarLink) => {
      const event = jcalHelper.jcal2content(ics, baseUrl);
      const recipients = Array.isArray(to) ? to : [to];

      return Q.allSettled(recipients.map(_send))
        .then(results => {
          logger.debug('Email has been sent', results);

          return results;
        })
        .catch(err => {
          logger.error('Can not send email to some recipients', err);
          throw err;
        });

      function _send(recipient) {
        return resolveUserEmail(recipient)
          .then(userEmail => i18nLib.getI18nForMailer(userEmail.user)
          .then(i18nConf => {
            const message = {
              attachments: [{
                filename: ATTACHMENT_NAME,
                content: ics,
                contentType: 'application/ics'
              }],
              from,
              subject: _getSubject(subject, i18nConf.translate),
              to: userEmail.email
            };
            const content = Object.assign({}, context, { baseUrl, event, seeInCalendarLink });

            return emailModule.getMailer().sendHTML(
              message,
              { name: emailTemplateName, path: TEMPLATE_PATH },
              { content, translate: i18nConf.translate }
            );
          }));
      }

      function _getSubject(subject, translate) {
        return _.isString(subject) ? translate(subject) : translate(subject.phrase, subject.parameters);
      }
    });
  }

  function resolveUserEmail(to) {
    if (to && to._id && to.preferredEmail) {
      return Promise.resolve({ user: to, email: to.preferredEmail });
    }

    return findByEmail(to).then(user => ({user, email: to}));
  }
};
