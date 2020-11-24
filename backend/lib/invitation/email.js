const ICAL = require('@linagora/ical.js');
const path = require('path');
const { promisify } = require('util');
const { jcal2content, getIcalDateAsMoment, getIcalEvent } = require('./../helpers/jcal');
const emailHelpers = require('./../helpers/email');
const TEMPLATES_PATH = path.resolve(__dirname, '../../../templates/email');

module.exports = dependencies => {
  const { getDisplayName, findByEmail } = dependencies('user');
  const domainModule = dependencies('domain');
  const configHelpers = dependencies('helpers').config;
  const emailModule = dependencies('email');
  const esnConfig = dependencies('esn-config');
  const datetimeHelpers = require('../helpers/datetime')(dependencies);
  const i18nLib = require('./../i18n')(dependencies);
  const invitationLink = require('./link')(dependencies);
  const linksHelper = require('../helpers/links')(dependencies);
  const processors = require('./processors')(dependencies);

  const getBaseURL = promisify(configHelpers.getBaseUrl);
  const findUserByEmail = promisify(findByEmail);
  const findDomainById = promisify(domainModule.load);

  return {
    sendNotificationEmails,
    replyFromExternalUser
  };

  function sendNotificationEmails({ sender, senderEmail, recipientEmail, method, ics, calendarURI, isNewEvent } = {}) {
    const validationError = _validateMessage({ recipientEmail, method, ics, calendarURI });

    if (validationError) return Promise.reject(validationError);

    if (sender) return _send(sender);

    if (typeof senderEmail !== 'string') {
      return Promise.reject(new Error('The senderEmail must be a string'));
    }

    return findUserByEmail(senderEmail).then(_send);

    function _send(emailSender) {
      if (!emailSender || !emailSender.domains || !emailSender.domains.length) {
        return Promise.reject(new Error('Sender must be a User object with at least one domain'));
      }

      return Promise.all([
        getBaseURL(emailSender),
        findUserByEmail(recipientEmail),
        findDomainById(emailSender.preferredDomainId)
      ]).then(([baseURL, recipient, domain]) => {
        const esnDatetimeConfig = esnConfig('datetime').inModule('core');
        const mailer = emailModule.getMailer(emailSender);

        if (!recipient) {
          return esnDatetimeConfig.forUser(emailSender, true).get()
            .then(datetimeOptions => _sendToRecipient({ method, ics, sender: emailSender, recipient, recipientEmail, domain, baseURL, isNewEvent, calendarURI, mailer, datetimeOptions }));
        }

        return esnDatetimeConfig.forUser(recipient, true).get()
          .then(datetimeOptions => _sendToRecipient({ method, ics, sender: emailSender, recipient, recipientEmail, domain, baseURL, isNewEvent, calendarURI, mailer, datetimeOptions }));
      });
    }
  }

  function replyFromExternalUser({ editorEmail, recipientEmail, ics, calendarURI, domain } = {}) {
    const method = 'REPLY';

    const validationError = _validateMessage({ recipientEmail, method, ics, calendarURI });

    if (validationError) return Promise.reject(validationError);

    return Promise.all([
      getBaseURL(null),
      findUserByEmail(recipientEmail)
    ]).then(([baseURL, recipient]) => {
      const mailer = emailModule.getMailer(recipient);
      const editor = {
        displayName: editorEmail,
        email: editorEmail
      };

      return _processorsHook({ method, ics, user: editor, recipient, recipientEmail, domain })
        .then(({ ics, emailContentOverrides }) => {
          const event = { ...jcal2content(ics, baseURL), ...emailContentOverrides };

          if (!_isRecipientInvolvedToEvent(recipientEmail, event)) {
            return Promise.reject(new Error('The recipient is not involved in the event'));
          }

          return i18nLib.getI18nForMailer(recipient)
            .then(({ i18n, locale, translate }) => {
              const template = { name: 'event.reply', path: TEMPLATES_PATH };
              const metadata = _getReplyContents({ event, editor });

              const subject = i18n.__({ phrase: metadata.subject.phrase, locale }, metadata.subject.parameters);
              const inviteMessage = i18n.__({ phrase: metadata.inviteMessage, locale }, {});
              const message = _buildMessage({ method, ics, subject, replyTo: editorEmail, to: recipientEmail });

              return _buildMessageContent({
                baseURL,
                calendarURI,
                editor,
                event,
                ics,
                inviteMessage,
                isExternalRecipient: !recipient,
                method,
                recipientEmail
              }).then(content => mailer.sendHTML(message, template, {
                content,
                filter: emailHelpers.filterEventAttachments(event),
                translate
              }));
            });
        });
    });
  }

  function _sendToRecipient({ method, ics, sender, recipient, recipientEmail, domain, baseURL, isNewEvent, calendarURI, mailer, datetimeOptions }) {
    return _processorsHook({ method, ics, user: sender, recipient, recipientEmail, domain })
      .then(({ ics, emailContentOverrides }) => {
        const event = { ...jcal2content(ics, baseURL), ...emailContentOverrides };
        const senderEmail = _getEmailFor(sender);
        const editor = {
          displayName: getDisplayName(sender),
          email: senderEmail
        };

        if (!_isRecipientInvolvedToEvent(recipientEmail, event)) {
          return Promise.reject(new Error('The recipient is not involved in the event'));
        }

        return i18nLib.getI18nForMailer(recipient)
          .then(({ i18n, locale, translate }) => {
            const metadata = _getMetadata({
              method,
              event,
              isNewEvent,
              editor
            });

            const subject = i18n.__({ phrase: metadata.subject.phrase, locale }, metadata.subject.parameters);
            const inviteMessage = i18n.__({ phrase: metadata.inviteMessage, locale }, {});
            const template = { name: metadata.templateName, path: TEMPLATES_PATH };
            const message = _buildMessage({ method, ics, subject, from: senderEmail, to: recipientEmail });

            return _buildMessageContent({
              baseURL,
              calendarHomeId: sender._id,
              calendarURI,
              editor,
              event,
              ics,
              inviteMessage,
              isExternalRecipient: !recipient,
              method,
              recipientEmail
            }).then(content => {
              const { timeZone: timezone, use24hourFormat } = datetimeOptions;
              const convertTzOptions = { timezone, locale, use24hourFormat };
              const icalEvent = getIcalEvent(ics);
              const { date: startDateString, time: startTimeString } = datetimeHelpers.formatDatetime(getIcalDateAsMoment(icalEvent.startDate), convertTzOptions);
              const { date: endDateString, time: endTimeString } = datetimeHelpers.formatDatetime(getIcalDateAsMoment(icalEvent.endDate), convertTzOptions);

              content.event = {
                ...content.event,
                start: {
                  date: startDateString,
                  time: startTimeString,
                  timezone
                },
                end: {
                  date: endDateString,
                  time: endTimeString,
                  timezone
                }
              };

              return mailer.sendHTML(message, template, {
                content,
                filter: emailHelpers.filterEventAttachments(event),
                translate
              });
            });
          });
      });
  }

  function _buildMessageContent({ method, baseURL, inviteMessage, ics, event, calendarURI, recipientEmail, editor, calendarHomeId, isExternalRecipient }) {
    const jwtPayload = {
      attendeeEmail: recipientEmail,
      organizerEmail: event.organizer.email,
      uid: event.uid,
      calendarURI
    };

    return invitationLink.generateActionLinks(baseURL, jwtPayload, isExternalRecipient)
      .then(links => {
        const content = {
          baseUrl: baseURL,
          inviteMessage,
          method,
          event,
          editor,
          ...links
        };

        if (calendarHomeId) {
          content.calendarHomeId = calendarHomeId;
        }

        if (isExternalRecipient) {
          return content;
        }

        return linksHelper.getEventInCalendar(ics)
          .then(seeInCalendarLink => ({
            ...content,
            seeInCalendarLink
          }));
      });
  }

  function _buildMessage({ method, ics, subject, from, replyTo, to }) {
    // This is a temporary fix since sabre does not send method in ICS and James needs it.
    const vcalendar = ICAL.Component.fromString(ics);
    let methodProperty = vcalendar.getFirstProperty('method');

    if (!methodProperty) {
      methodProperty = new ICAL.Property('method');
      methodProperty.setValue(method);
      vcalendar.addProperty(methodProperty);
      ics = vcalendar.toString();
    }

    return {
      subject,
      encoding: 'base64',
      alternatives: [{
        content: ics,
        contentType: `text/calendar; charset=UTF-8; method=${method}`
      }],
      attachments: [{
        filename: 'meeting.ics',
        content: ics,
        contentType: 'application/ics'
      }],
      to,
      ...from ? { from } : {},
      ...replyTo ? { replyTo } : {}
    };
  }

  function _isRecipientInvolvedToEvent(recipientEmail, event) {
    let recipientIsInvolved = recipientEmail === event.organizer.email;

    if (event.attendees && event.attendees[recipientEmail]) {
      recipientIsInvolved = event.attendees[recipientEmail].partstat ? event.attendees[recipientEmail].partstat !== 'DECLINED' : true;
    }

    return recipientIsInvolved;
  }

  function _processorsHook({ method, ics, user, recipient, recipientEmail, domain }) {
    const emailContentOverrides = {};

    return processors.process(method, { attendeeEmail: recipientEmail, attendeeAsUser: recipient, ics, user, domain, emailContentOverrides })
      .then(({ ics, emailContentOverrides }) => ({ ics, emailContentOverrides }))
      .catch(() => ({ ics, emailContentOverrides }));
  }

  function _getEmailFor(user) {
    return user && (user.email || user.emails[0]);
  }

  function _getMetadata({ method, event, isNewEvent = false, editor } = {}) {
    let subject, templateName, inviteMessage;
    const { summary, organizer } = event;
    const organizerName = organizer.cn || organizer.email;

    switch (method) {
      case 'REQUEST':
        if (isNewEvent) {
          subject = {
            phrase: 'New event from {{organizerName}}: {{& summary}}',
            parameters: {
              summary,
              organizerName: organizerName
            }
          };
          templateName = 'event.invitation';
          inviteMessage = 'has invited you to a meeting';
        } else {
          subject = {
            phrase: 'Event {{& summary}} from {{organizerName}} updated',
            parameters: {
              summary,
              organizerName: organizerName
            }
          };
          templateName = 'event.update';
          inviteMessage = 'has updated a meeting';
        }
        break;
      case 'REPLY':
        templateName = 'event.reply';
        ({ subject, inviteMessage } = _getReplyContents({ event, editor }));
        break;
      case 'CANCEL':
        subject = {
          phrase: 'Event {{& summary}} from {{organizerName}} canceled',
          parameters: {
            summary,
            organizerName: organizerName
          }
        };
        templateName = 'event.cancel';
        inviteMessage = 'has canceled a meeting';
        break;
      case 'COUNTER':
        subject = {
          phrase: 'New changes proposed to event {{& summary}}',
          parameters: {
            summary
          }
        };
        templateName = 'event.counter';
        inviteMessage = 'has proposed changes to the event';
        break;
      default:
        subject = {
          phrase: 'Unknown method'
        };
        templateName = 'event.invitation';
    }

    return {
      subject,
      templateName,
      inviteMessage
    };
  }

  function _getReplyContents({ event, editor } = {}) {
    let subject, inviteMessage;
    const { summary } = event;
    const { displayName: editorDisplayName, email: editorEmail } = editor;
    const editorParticipationStatus = event.attendees && event.attendees[editorEmail] && event.attendees[editorEmail].partstat;

    switch (editorParticipationStatus) {
      case 'ACCEPTED':
        subject = {
          phrase: 'Accepted: {{& summary}} ({{editorDisplayName}})',
          parameters: {
            summary,
            editorDisplayName
          }
        };
        inviteMessage = 'has accepted this invitation';
        break;
      case 'DECLINED':
        subject = {
          phrase: 'Declined: {{& summary}} ({{editorDisplayName}})',
          parameters: {
            summary,
            editorDisplayName
          }
        };
        inviteMessage = 'has declined this invitation';
        break;
      case 'TENTATIVE':
        subject = {
          phrase: 'Tentatively accepted: {{& summary}} ({{editorDisplayName}})',
          parameters: {
            summary,
            editorDisplayName
          }
        };
        inviteMessage = 'has replied "Maybe" to this invitation';
        break;
      default:
        subject = {
          phrase: 'Participation updated: {{& summary}}',
          parameters: {
            summary
          }
        };
        inviteMessage = 'has changed his participation';
    }

    return {
      subject,
      inviteMessage
    };
  }

  function _validateMessage({ recipientEmail, method, ics, calendarURI }) {
    if (typeof recipientEmail !== 'string') {
      return new Error('The recipientEmail must be a string');
    }

    if (typeof method !== 'string') {
      return new Error('The method must be a string');
    }

    if (typeof ics !== 'string') {
      return new Error('The ics must be a string');
    }

    if (typeof calendarURI !== 'string') {
      return new Error('The calendarURI must be a string');
    }
  }
};
