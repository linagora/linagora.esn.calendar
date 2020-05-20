const ICAL = require('@linagora/ical.js');
const Q = require('q');
const path = require('path');
const extend = require('extend');
const {jcal2content} = require('./../helpers/jcal');
const emailHelpers = require('./../helpers/email');
const TEMPLATES_PATH = path.resolve(__dirname, '../../../templates/email');

module.exports = dependencies => {
  const userModule = dependencies('user');
  const configHelpers = dependencies('helpers').config;
  const emailModule = dependencies('email');
  const i18nLib = require('./../i18n')(dependencies);
  const invitationLink = require('./link')(dependencies);
  const linksHelper = require('../helpers/links')(dependencies);
  const processors = require('./processors')(dependencies);

  return {
    send
  };

  function send({ sender, recipientEmail, method, ics, calendarURI, domain, newEvent } = {}) {
    if (!sender || !sender.domains || !sender.domains.length) {
      return Promise.reject(new Error('User must be an User object'));
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

    const mailer = emailModule.getMailer(sender);

    return Promise.all([
      Q.nfbind(configHelpers.getBaseUrl)(sender),
      Q.nfbind(userModule.findByEmail)(recipientEmail),
      linksHelper.getEventInCalendar(ics)
    ])
    .then(result => {
      const [, recipientAsUser] = result;
      const emailContentOverrides = {};

      return processors.process(method, { attendeeEmail: recipientEmail, attendeeAsUser: recipientAsUser, ics, user: sender, domain, emailContentOverrides })
        .then(({ ics, emailContentOverrides }) => ({ result, ics, emailContentOverrides }))
        .catch(() => ({ result, ics, emailContentOverrides }));
    })
    .then(({ result, ics, emailContentOverrides }) => {
      const [baseUrl, recipient, seeInCalendarLink] = result;
      const isExternalUser = !recipient;

      return i18nLib.getI18nForMailer(recipient).then(({ i18n, locale, translate }) => {
        const senderEmail = _getEmailFor(sender);
        const event = { ...jcal2content(ics, baseUrl), ...emailContentOverrides };
        const template = { name: 'event.invitation', path: TEMPLATES_PATH };

        let recipientIsInvolved = recipientEmail === event.organizer.email;

        if (event.attendees && event.attendees[recipientEmail]) {
          recipientIsInvolved = event.attendees[recipientEmail].partstat ? event.attendees[recipientEmail].partstat !== 'DECLINED' : true;
        }

        if (!recipientIsInvolved) {
          return Promise.reject(new Error('The attendee is not involved in the event'));
        }

        const senderParticipationStatus = event.attendees && event.attendees[senderEmail] && event.attendees[senderEmail].partstat;
        const metadata = _getMetadata({
          method,
          senderParticipationStatus,
          newEvent, 
          summary: event.summary,
          senderDisplayName: userModule.getDisplayName(sender)
        });

        const subject = i18n.__({ phrase: metadata.subject.phrase, locale }, metadata.subject.parameters);
        const inviteMessage = i18n.__({ phrase: metadata.inviteMessage, locale }, {});

        template.name = metadata.templateName;

        // This is a temporary fix since sabre does not send method in ICS and James needs it.
        const vcalendar = ICAL.Component.fromString(ics);
        let methodProperty = vcalendar.getFirstProperty('method');

        if (!methodProperty) {
          methodProperty = new ICAL.Property('method');
          methodProperty.setValue(method);
          vcalendar.addProperty(methodProperty);
          ics = vcalendar.toString();
        }

        const message = {
          from: senderEmail,
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
          }]
        };
        const content = {
          baseUrl,
          inviteMessage,
          method,
          event,
          editor: {
            displayName: userModule.getDisplayName(sender),
            email: senderEmail
          },
          calendarHomeId: sender._id
        };

        if (!isExternalUser) {
          content.seeInCalendarLink = seeInCalendarLink;
        }

        const jwtPayload = {
          attendeeEmail: _getEmailFor(recipient) || recipientEmail,
          organizerEmail: event.organizer.email,
          uid: event.uid,
          calendarURI
        };

        return invitationLink.generateActionLinks(baseUrl, jwtPayload).then(links => {
          const contentWithLinks = {};
          const email = {};

          extend(true, contentWithLinks, content, links);
          extend(true, email, message, {
            to: recipientEmail
          });

          return mailer.sendHTML(email, template, {
            content: contentWithLinks,
            filter: emailHelpers.filterEventAttachments(event),
            translate
          });
        });
      });
    });
  }

  function _getMetadata({ method, senderParticipationStatus, newEvent = false, summary, senderDisplayName } = {}) {
    let subject, templateName, inviteMessage;
  
    switch (method) {
      case 'REQUEST':
        if (newEvent) {
          subject = {
            phrase: 'New event from {{senderDisplayName}}: {{& summary}}',
            parameters: {
              summary,
              senderDisplayName
            }
          };
          templateName = 'event.invitation';
          inviteMessage = 'has invited you to a meeting';
        } else {
          subject = {
            phrase: 'Event {{& summary}} from {{senderDisplayName}} updated',
            parameters: {
              summary,
              senderDisplayName
            }
          };
          templateName = 'event.update';
          inviteMessage = 'has updated a meeting';
        }
        break;
      case 'REPLY':
        templateName = 'event.reply';
        ({ subject, inviteMessage } = _getReplyContents({ senderParticipationStatus, summary, senderDisplayName }));
        break;
      case 'CANCEL':
        subject = {
          phrase: 'Event {{& summary}} from {{senderDisplayName}} canceled',
          parameters: {
            summary,
            senderDisplayName
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
  
  function _getReplyContents({ senderParticipationStatus, summary, senderDisplayName } = {}) {
    let subject, inviteMessage;
  
    switch (senderParticipationStatus) {
      case 'ACCEPTED':
        subject = {
          phrase: 'Accepted: {{& summary}} ({{senderDisplayName}})',
          parameters: {
            summary,
            senderDisplayName
          }
        };
        inviteMessage = 'has accepted this invitation';
        break;
      case 'DECLINED':
        subject = {
          phrase: 'Declined: {{& summary}} ({{senderDisplayName}})',
          parameters: {
            summary,
            senderDisplayName
          }
        };
        inviteMessage = 'has declined this invitation';
        break;
      case 'TENTATIVE':
        subject = {
          phrase: 'Tentatively accepted: {{& summary}} ({{senderDisplayName}})',
          parameters: {
            summary,
            senderDisplayName
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
}
