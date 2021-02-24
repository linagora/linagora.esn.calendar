const util = require('util');
const path = require('path');
const Q = require('q');
const _ = require('lodash');
const mjml2html = require('mjml');
const jcalHelper = require('../helpers/jcal');
const { isValidURL, isAbsoluteURL } = require('../helpers/url');
const TEMPLATE_PATH = path.resolve(__dirname, '../../../templates/email');
const ATTACHMENT_NAME = 'meeting.ics';

module.exports = dependencies => {
  const helpers = dependencies('helpers');
  const emailModule = dependencies('email');
  const esnConfig = dependencies('esn-config');
  const logger = dependencies('logger');
  const userModule = dependencies('user');
  const i18nLib = require('../i18n')(dependencies);
  const linksHelper = require('../helpers/links')(dependencies);
  const emailEventHelper = require('../helpers/email-event')(dependencies);
  const findUserByEmail = util.promisify(userModule.findByEmail);
  const getBaseURL = util.promisify(helpers.config.getBaseUrl);

  return {
    send,
    sendWithCustomTemplateFunction
  };

  function send({from, to, subject, ics, eventPath, emailTemplateName, context = {}, headers = {}, includeICS}) {
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
          logger.debug('Email has been sent', JSON.stringify(results));

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
              encoding: 'base64',
              from,
              subject: _getSubject(subject, i18nConf.translate),
              to: userEmail.email,
              headers
            };

            if (includeICS) {
              message.alternatives = [{
                content: ics,
                contentType: 'text/calendar; charset=UTF-8;'
              }];

              message.attachments = [{
                filename: ATTACHMENT_NAME,
                content: ics,
                contentType: 'application/ics'
              }];
            }
            const content = Object.assign({}, context, { baseUrl, event, seeInCalendarLink });

            return emailModule.getMailer(userEmail.user).sendHTML(
              message,
              { name: emailTemplateName, path: TEMPLATE_PATH },
              { content, translate: i18nConf.translate }
            );
          }));
      }
    });
  }

  function sendWithCustomTemplateFunction({
    from,
    to,
    subject,
    ics,
    emailTemplateName,
    context = {},
    headers = {},
    templateFn
  }) {
    return Promise.all([
      getBaseURL(null),
      linksHelper.getEventInCalendar(ics)
    ])
      .then(([baseURL, seeInCalendarLink]) => {
        const recipients = Array.isArray(to) ? to : [to];

        return Promise.all(recipients.map(_sendEmail))
          .then(results => {
            logger.info('Email has been sent to recipients', JSON.stringify(results));

            return results;
          })
          .catch(err => {
            logger.error('Could not send email to some recipients', err);

            throw err;
          });

        function _sendEmail(to) {
          return resolveUserEmail(to)
            .then(({ user: recipient, email: recipientEmail }) =>
              Promise.all([
                i18nLib.getI18nForMailer(recipient),
                esnConfig('datetime').inModule('core').forUser(recipient, true).get()
              ])
                .then(([{ translate, locale }, datetimeOptions]) => {
                  const message = {
                    encoding: 'base64',
                    from,
                    subject: _getSubject(subject, translate),
                    to: recipientEmail,
                    headers
                  };
                  const event = jcalHelper.jcal2content(ics, baseURL);
                  const content = { ...context, baseUrl: baseURL, event, seeInCalendarLink };
                  const { timeZone: timezone, use24hourFormat } = datetimeOptions;

                  content.event = {
                    ...content.event,
                    isLocationAValidURL: isValidURL(content.event.location),
                    isLocationAnAbsoluteURL: isAbsoluteURL(content.event.location),
                    ...emailEventHelper.getContentEventStartAndEnd({
                      ics,
                      isAllDay: content.event.allDay,
                      timezone,
                      use24hourFormat,
                      locale
                    })
                  };

                  return emailModule.getMailer(recipient).sendWithCustomTemplateFunction({
                    message,
                    template: { name: emailTemplateName, path: TEMPLATE_PATH },
                    templateFn: typeof templateFn === 'function' ? templateFn : mjml => mjml2html(mjml).html,
                    locals: { content, translate }
                  });
                })
            );
        }
      });
  }

  function _getSubject(subject, translate) {
    return _.isString(subject) ? translate(subject) : translate(subject.phrase, subject.parameters);
  }

  function resolveUserEmail(to) {
    if (to && to._id && to.preferredEmail) {
      return Promise.resolve({ user: to, email: to.preferredEmail });
    }

    return findUserByEmail(to).then(user => ({user, email: to}));
  }
};
