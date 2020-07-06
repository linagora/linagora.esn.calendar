const ICAL = require('@linagora/ical.js');
const path = require('path');
const { promisify } = require('util');

const { jcal2content } = require('./../helpers/jcal');
const emailHelpers = require('./../helpers/email');
const TEMPLATES_PATH = path.resolve(__dirname, '../../../templates/email');

module.exports = dependencies => {
  const { getDisplayName, findByEmail } = dependencies('user');
  const configHelpers = dependencies('helpers').config;
  const emailModule = dependencies('email');
  const i18nLib = require('./../i18n')(dependencies);
  const invitationLink = require('./link')(dependencies);
  const linksHelper = require('../helpers/links')(dependencies);
  const processors = require('./processors')(dependencies);

  const getBaseURL = promisify(configHelpers.getBaseUrl);
  const findUserByEmail = promisify(findByEmail);

  return {
    send,
    replyFromExternalUser
  };

  function send({ sender, recipientEmail, method, ics, calendarURI, domain, newEvent } = {}) {
    if (!sender || !sender.domains || !sender.domains.length) {
      return Promise.reject(new Error('Sender must be an User object'));
    }

    if (!recipientEmail) {
      return Promise.reject(new Error('The attendeeEmail is required'));
    }

    if (!method) {
      return Promise.reject(new Error('The method is required'));
    }

    if (!ics) {
      return Promise.reject(new Error('The ics is required'));
    }

    return Promise.all([
      getBaseURL(sender),
      findUserByEmail(recipientEmail)
    ]).then(([baseURL, recipient]) => {
      const mailer = emailModule.getMailer(sender);

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
                newEvent,
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
              }).then(content => mailer.sendHTML(message, template, {
                content,
                filter: emailHelpers.filterEventAttachments(event),
                translate
              }));
            });
        });
    });
  }

  function replyFromExternalUser({ editorEmail, recipientEmail, ics, calendarURI, domain } = {}) {
    const method = 'REPLY';

    if (!editorEmail) {
      return Promise.reject(new Error('The editorEmail is required'));
    }

    if (!recipientEmail) {
      return Promise.reject(new Error('The attendeeEmail is required'));
    }

    if (!method) {
      return Promise.reject(new Error('The method is required'));
    }

    if (!ics) {
      return Promise.reject(new Error('The ics is required'));
    }

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

  function _buildMessageContent({ method, baseURL, inviteMessage, ics, event, calendarURI, recipientEmail, editor, calendarHomeId, isExternalRecipient }) {
    const jwtPayload = {
      attendeeEmail: recipientEmail,
      organizerEmail: event.organizer.email,
      uid: event.uid,
      calendarURI
    };

    return invitationLink.generateActionLinks(baseURL, jwtPayload)
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

  function _getMetadata({ method, event, newEvent = false, editor } = {}) {
    let subject, templateName, inviteMessage;
    const { summary } = event;
    const { displayName: editorDisplayName } = editor;

    switch (method) {
      case 'REQUEST':
        if (newEvent) {
          subject = {
            phrase: 'New event from {{editorDisplayName}}: {{& summary}}',
            parameters: {
              summary,
              editorDisplayName
            }
          };
          templateName = 'event.invitation';
          inviteMessage = 'has invited you to a meeting';
        } else {
          subject = {
            phrase: 'Event {{& summary}} from {{editorDisplayName}} updated',
            parameters: {
              summary,
              editorDisplayName
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
          phrase: 'Event {{& summary}} from {{editorDisplayName}} canceled',
          parameters: {
            summary,
            editorDisplayName
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
};
