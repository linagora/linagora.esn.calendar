'use strict';

const { EVENTS, RESOURCE } = require('../constants');

module.exports = dependencies => {
  const simpleMailModule = dependencies('email').system.simpleMail;
  const pubsub = dependencies('pubsub');
  const logger = dependencies('logger');
  const caldavClient = require('../caldav-client')(dependencies);

  return {
    listen
  };

  function listen() {
    pubsub.local.topic(EVENTS.RESOURCE.CREATED).subscribe(_create);
    pubsub.local.topic(EVENTS.RESOURCE.DELETED).subscribe(_delete);

    function _handleError(resource, response, mailOptions) {
      const { subject, text } = mailOptions;
      const { body } = response || {};

      logger.error(`Error while request calDav server, a mail will be sent at the resource\'s creator: ${resource.creator} with the message: ${body || response}`);

      return simpleMailModule(resource.creator, { subject, text });
    }

    function _create(resource) {
      if (resource.type !== RESOURCE.TYPE.CALENDAR) {
        return;
      }

      const mailOptions = {
         subject: RESOURCE.ERROR.MAIL.CREATED.SUBJECT,
         text: RESOURCE.ERROR.MAIL.CREATED.MESSAGE
      };

      return caldavClient.createResourceCalendar(resource)
        .then(response => {
          if (response.statusCode !== 201) {
            _handleError(resource, response, mailOptions);
          }

          logger.info(`Calendar created for the resource: ${resource._id} with the status: ${response.statusCode}`);
        })
        .catch(error => _handleError(resource, error, mailOptions));
    }

    function _delete(resource) {
      if (resource.type !== RESOURCE.TYPE.CALENDAR) {
        return;
      }

      const mailOptions = {
        subject: RESOURCE.ERROR.MAIL.REMOVED.SUBJECT,
        text: RESOURCE.ERROR.MAIL.REMOVED.MESSAGE
     };

      return caldavClient.deleteResourceCalendars(resource)
        .then(response => {
          if (response.statusCode !== 204) {
            _handleError(resource, response, mailOptions);
          }

          logger.info(`Calendar removed for the resource: ${resource._id} with the status: ${response.statusCode}`);
        })
        .catch(error => _handleError(resource, error, mailOptions));
    }
  }
};
