'use strict';

const q = require('q');
const { EVENTS, RESOURCE } = require('../constants');
const RESOURCE_COLOR = '#F44336';

module.exports = dependencies => {
  const simpleMailModule = dependencies('email').system.simpleMail;
  const pubsub = dependencies('pubsub');
  const logger = dependencies('logger');
  const { getBaseUrl } = dependencies('helpers').config;

  const caldavClient = require('../caldav-client')(dependencies);

  return {
    listen
  };

  function listen() {
    pubsub.local.topic(EVENTS.RESOURCE.CREATED).subscribe(_create);
    pubsub.local.topic(EVENTS.RESOURCE.UPDATED).subscribe(_update);
    pubsub.local.topic(EVENTS.RESOURCE.DELETED).subscribe(_delete);
  }

  function _handleError(resource, response, mailOptions) {
    const { subject, text } = mailOptions;
    const { body } = response || {};

    logger.error(`Error while request calDav server, a mail will be sent at the resource's creator: ${resource.creator} with the message: ${body || response}`);

    return simpleMailModule(resource.creator, { subject, text })
      .catch(err => logger.error(`Error while sending email to resource's creator ${resource.creator}`, err));
  }

  function _create(resource) {
    if (resource.type !== RESOURCE.TYPE.CALENDAR) {
      return;
    }

    const mailOptions = {
        subject: RESOURCE.ERROR.MAIL.CREATED.SUBJECT,
        text: RESOURCE.ERROR.MAIL.CREATED.MESSAGE
    };

    const options = {
      userId: resource._id,
      calendarUri: resource._id,
      domainId: resource.domain
    };

    return caldavClient.getCalendarAsTechnicalUser(options)
      .then(() => _generateResourcePayload(resource))
      .then(payload => caldavClient.updateCalendarAsTechnicalUser(options, payload))
      .then(response => {
        if (response.statusCode !== 204) {
          _handleError(resource, response, mailOptions);
        }

        logger.info(`Calendar created for the resource: ${resource._id}`);
      })
      .catch(error => _handleError(resource, error, mailOptions));
  }

  function _update(resource) {
    if (resource.type !== RESOURCE.TYPE.CALENDAR) {
      return;
    }

    const NO_UPDATED = 'No update for this resource calendar\'s';
    const mailOptions = {
      subject: RESOURCE.ERROR.MAIL.UPDATED.SUBJECT,
      text: RESOURCE.ERROR.MAIL.UPDATED.MESSAGE
    };
    const options = {
      userId: resource._id,
      calendarUri: resource._id,
      domainId: resource.domain
    };

    return caldavClient.getCalendarAsTechnicalUser(options)
      .then(calendar => {
        if (_resourceHasChange(resource, calendar)) {
          return _generateResourcePayload(resource);
        }

        return Promise.reject(NO_UPDATED);
      })
      .then(payload => caldavClient.updateCalendarAsTechnicalUser(options, payload))
      .then(response => {
        if (response.statusCode !== 204) {
          _handleError(resource, response, mailOptions);
        }

        logger.info(`Calendar updated for the resource: ${resource._id} with the status: ${response.statusCode}`);
      })
      .catch(error => {
        if (error && error === NO_UPDATED) {
          logger.warn(`Calendar is already up to date for the resource: ${resource._id}`);

          return;
        }

        return _handleError(resource, error, mailOptions);

      });
  }

  function _delete(resource) {
    if (resource.type !== RESOURCE.TYPE.CALENDAR) {
      return;
    }

    const mailOptions = {
      subject: RESOURCE.ERROR.MAIL.REMOVED.SUBJECT,
      text: RESOURCE.ERROR.MAIL.REMOVED.MESSAGE
    };
    const options = {
      userId: resource._id,
      domainId: resource.domain
    };

    return caldavClient.deleteCalendarsAsTechnicalUser(options)
      .then(response => {
        if (response.statusCode !== 204) {
          _handleError(resource, response, mailOptions);
        }

        logger.info(`Calendar removed for the resource: ${resource._id} with the status: ${response.statusCode}`);
      })
      .catch(error => _handleError(resource, error, mailOptions));
  }

  function _resourceHasChange(resource, calendar) {
    return resource.name !== calendar.name || resource.description !== calendar.description;
  }

  function _generateResourcePayload(resource) {
    return _generateIcalImage(resource)
      .then(image => ({
        id: resource._id,
        'dav:name': resource.name,
        'apple:color': RESOURCE_COLOR,
        'caldav:description': resource.description,
        image
      }));
  }

  function _generateIcalImage(resource) {
    return q.nfcall(getBaseUrl, null)
      .then(baseUrl => {
        const image = resource.icon ? resource.icon : RESOURCE.DEFAULT_ICON;
        const icalImage = `IMAGE;VALUE=URI;DISPLAY=BADGE;FMTTYPE=image/png:${baseUrl}${RESOURCE.ICONS_PATH}${image}.png`;

        logger.debug(`Calendar of resource ${resource._id} with image ${icalImage}`);

        return icalImage;
    });
  }
};
