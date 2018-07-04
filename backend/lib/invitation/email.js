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

  return {
    send
  };

  function send(user, attendeeEmail, method, ics, calendarURI, eventPath) {
    if (!user || !user.domains || !user.domains.length) {
      return Promise.reject(new Error('User must be an User object'));
    }

    if (!attendeeEmail) {
      return Promise.reject(new Error('The attendeeEmail is required'));
    }

    if (!method) {
      return Promise.reject(new Error('The method is required'));
    }

    if (!ics) {
      return Promise.reject(new Error('The ics is required'));
    }

    const mailer = emailModule.getMailer(user);

    return Promise.all([
      Q.nfbind(configHelpers.getBaseUrl)(user),
      Q.nfbind(userModule.findByEmail)(attendeeEmail),
      eventPath ? linksHelper.getEventDetails(eventPath) : Promise.resolve(false),
      linksHelper.getEventInCalendar(ics)
    ])
    .then(result => {
      const [baseUrl, attendee, , seeInCalendarLink] = result;
      const attendeePreferedEmail = attendee ? attendee.email || attendee.emails[0] : attendeeEmail;
      const isExternalUser = !attendee;

      return i18nLib.getI18nForMailer(attendee).then(i18nConf => {
        let subject = 'Unknown method';
        const userEmail = user.email || user.emails[0];
        const event = jcal2content(ics, baseUrl);
        const template = { name: 'event.invitation', path: TEMPLATES_PATH };
        const i18n = i18nConf.i18n;
        let inviteMessage;

        switch (method) {
          case 'REQUEST':
            if (event.sequence > 0) {
              subject = _i18nHelper('Event {{& summary}} from {{userDisplayName}} updated', true, true);
              template.name = 'event.update';
              inviteMessage = _i18nHelper('has updated a meeting');
            } else {
              subject = _i18nHelper('New event from {{userDisplayName}}: {{& summary}}', true, true);
              template.name = 'event.invitation';
              inviteMessage = _i18nHelper('has invited you to a meeting');
            }
            break;
          case 'REPLY':
            template.name = 'event.reply';
            [subject, inviteMessage] = _getReplyContents();
            break;
          case 'CANCEL':
            subject = _i18nHelper('Event {{& summary}} from {{userDisplayName}} canceled', true, true);
            template.name = 'event.cancel';
            inviteMessage = _i18nHelper('has canceled a meeting');
            break;
          case 'COUNTER':
            subject = _i18nHelper('New changes proposed to event {{& summary}}', true, true);
            template.name = 'event.counter';
            inviteMessage = _i18nHelper('has proposed changes to the event');
            break;
        }

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
          from: userEmail,
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
            displayName: userModule.getDisplayName(user),
            email: user.email || user.emails[0]
          },
          calendarHomeId: user._id
        };

        if (!isExternalUser) {
          content.seeInCalendarLink = seeInCalendarLink;
        }

        let userIsInvolved = attendeeEmail === event.organizer.email;

        if (event.attendees && event.attendees[attendeeEmail]) {
          userIsInvolved = event.attendees[attendeeEmail].partstat ? event.attendees[attendeeEmail].partstat !== 'DECLINED' : true;
        }

        if (!userIsInvolved) {
          return Promise.reject(new Error('The user is not involved in the event'));
        }

        const jwtPayload = {
          attendeeEmail: attendeePreferedEmail,
          organizerEmail: event.organizer.email,
          uid: event.uid,
          calendarURI
        };

        return invitationLink.generateActionLinks(baseUrl, jwtPayload).then(links => {
          const contentWithLinks = {};
          const email = {};

          extend(true, contentWithLinks, content, links);
          extend(true, email, message, {
            to: attendeeEmail
          });

          return mailer.sendHTML(email, template, {
            content: contentWithLinks,
            filter: emailHelpers.filterEventAttachments(event),
            translate: i18nConf.translate
          });
        });

        function _getReplyContents() {
          const response = [];

          switch (_getParticipationStatus(event, userEmail)) {
            case 'ACCEPTED':
              response.push(_i18nHelper('Accepted: {{& summary}} ({{userDisplayName}})', true, true));
              response.push(_i18nHelper('has accepted this invitation'));
              break;
            case 'DECLINED':
              response.push(_i18nHelper('Declined: {{& summary}} ({{userDisplayName}})', true, true));
              response.push(_i18nHelper('has declined this invitation'));
              break;
            case 'TENTATIVE':
              response.push(_i18nHelper('Tentatively accepted: {{& summary}} ({{userDisplayName}})', true, true));
              response.push(_i18nHelper('has replied "Maybe" to this invitation'));
              break;
            default:
              response.push(_i18nHelper('Participation updated: {{& summary}}', true));
              response.push(_i18nHelper('has changed his participation'));
          }

          return response;
        }

        function _getParticipationStatus(event, attendeeEmail) {
          if (!event.attendees || !event.attendees[attendeeEmail] || !event.attendees[attendeeEmail].partstat) {
            return;
          }

          return event.attendees[attendeeEmail].partstat;
        }

        function _i18nHelper(phrase, isSummaryExist = false, isUserDisplayNameExists = false) {
          const option = Object.assign(
            {},
            isSummaryExist ? { summary: event.summary } : {},
            isUserDisplayNameExists ? { userDisplayName: userModule.getDisplayName(user) } : {}
          );

          return i18n.__({phrase: phrase, locale: i18nConf.locale}, option);
        }
      });
    });
  }
};
