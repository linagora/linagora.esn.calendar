'use strict';

const q = require('q');
const { USER, DEFAULT_CALENDAR_NAME } = require('../constants');

module.exports = dependencies => {
  const pubsub = dependencies('pubsub');
  const userModule = dependencies('user');
  const logger = dependencies('logger');

  const caldavClient = require('../caldav-client')(dependencies);

  return {
    listen
  };

  function listen() {
    pubsub.local.topic(USER.CREATED).subscribe(_create);
  }

  function _handleError(user, response) {
    const { body } = response || {};

    logger.error(`Error while request calDav server for new user ${user._id} default calendar creation with the message: ${body || response}`);
  }

  function _create(user) {
    return q.nfcall(userModule.get, user._id)
      .then(_generateResourceOptions)
      .then(calDavOptions => caldavClient.createCalendarAsTechnicalUser(calDavOptions.options, calDavOptions.payload))
      .then(response => {
        if (response.statusCode !== 201) {
          _handleError(user, response);
        }

        logger.info(`Calendar created for the user: ${user._id} with the status: ${response.statusCode}`);
      })
      .catch(error => _handleError(user, error));
  }

  function _generateResourceOptions(user) {
    const options = {
      userId: user._id,
      domainId: user.domains[0].domain_id
    };

    const payload = {
      id: user._id,
      'dav:name': DEFAULT_CALENDAR_NAME
    };

    return {
      options,
      payload
    };
  }
};
