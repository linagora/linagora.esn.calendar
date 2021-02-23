const CONSTANTS = require('../constants');
let initialized = false;

module.exports = dependencies => {
  const logger = dependencies('logger');
  const { pointToPoint: pointToPointMessaging } = dependencies('messaging');
  const notificationEmail = require('./email')(dependencies);

  return {
    init
  };

  function init() {
    if (initialized) {
      return logger.error('The event invitation pubsub has already been initialized');
    }

    initListeners();

    initialized = true;
  }

  function initListeners() {
    pointToPointMessaging.get(CONSTANTS.EVENTS.NOTIFICATION_EMAIL.SEND).receive(sendEmail);
  }

  function sendEmail(msg) {
    const { senderEmail, recipientEmail, notify, method, event, oldEvent, calendarURI, isNewEvent } = msg;

    if (typeof recipientEmail !== 'string') {
      return logger.error('Error when trying to send notification emails to the attendee. Reason: The recipient email is missing or invalid. ' +
        `Message: ${JSON.stringify(msg)}`
      );
    }

    if (typeof method !== 'string') {
      return logger.error(`Error when trying to send notification emails to attendee: "${recipientEmail}". Reason: Method is required and must be a string (REQUEST, REPLY, CANCEL, etc.). ` +
        `Message: ${JSON.stringify(msg)}`
      );
    }

    if (typeof event !== 'string') {
      return logger.error(`Error when trying to send notification emails to attendee: "${recipientEmail}". Reason: Event is required and must be a string (ICS format)
        Message: ${JSON.stringify(msg)}
      `);
    }

    if (typeof calendarURI !== 'string') {
      return logger.error(`Error when trying to send notification emails to attendee: "${recipientEmail}". Reason: Calendar Id is required and must be a string
        Message: ${JSON.stringify(msg)}
      `);
    }

    if (!notify) return;

    return notificationEmail.sendNotificationEmails({
      senderEmail,
      recipientEmail,
      method,
      ics: event,
      oldIcs: oldEvent,
      calendarURI,
      isNewEvent
    })
      .then(() => {
        logger.info(`Successfully sent notification emails to attendee: "${recipientEmail}". Message: ${JSON.stringify(msg)}`);
      })
      .catch(err => {
        logger.error(`Error when trying to send notification emails to attendee: "${recipientEmail}". Error: ${err.message}. Message: ${JSON.stringify(msg)}`);
      });
  }
};
