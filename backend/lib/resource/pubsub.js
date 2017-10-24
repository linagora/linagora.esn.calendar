'use strict';

const request = require('request');
const q = require('q');
const { EVENTS, RESOURCE } = require('../constants');
const RESOURCE_COLOR = '#F44336';

module.exports = dependencies => {
  const simpleMailModule = dependencies('email').system.simpleMail;
  const pubsub = dependencies('pubsub');
  const logger = dependencies('logger');
  const davserver = dependencies('davserver').utils;
  const technicalUserHelper = require('../helpers/technical-user')(dependencies);

  return {
    listen
  };

  function listen() {
    pubsub.local.topic(EVENTS.RESOURCE.CREATED).subscribe(_create);
    pubsub.local.topic(EVENTS.RESOURCE.DELETED).subscribe(_delete);

    function generatePayload(resource) {
      return {
        id: resource._id,
        'dav:name': resource.name,
        'apple:color': RESOURCE_COLOR,
        'caldav:description': resource.description
      };
    }

    function _buildDavUrl(resourceId, callback) {
      return davserver.getDavEndpoint(davserver => callback(null, `${davserver}/calendars/${resourceId}.json`));
    }

    function _create(resource) {
      if (resource.type !== RESOURCE.TYPE.CALENDAR) {
        return;
      }

      return q.all([
        q.nfcall(_buildDavUrl, resource._id),
        technicalUserHelper.getTechnicalUserToken(resource.domain)
      ])
      .spread((davUrl, token) => request(
        {
          method: 'POST',
          headers: { ESNToken: token.token },
          url: davUrl,
          body: generatePayload(resource),
          json: true
        },
        (err, response, body) => {
        if (err || response.statusCode !== 201) {
          logger.error(`Error while request calDav server, a mail will be sent at the resource\'s creator: ${err || response.statusCode} with the message: ${body}`);

          return simpleMailModule(resource.creator, { subject: RESOURCE.ERROR.MAIL.CREATED.SUBJECT, text: RESOURCE.ERROR.MAIL.CREATED.MESSAGE });
        }

        logger.info(`Calendar created for the resource: ${resource._id} with the status: ${response.statusCode}`);
      }));
    }

    function _delete(resource) {
      if (resource.type !== RESOURCE.TYPE.CALENDAR) {
        return;
      }

      return q.all([
        q.nfcall(_buildDavUrl, resource._id),
        technicalUserHelper.getTechnicalUserToken(resource.domain)
      ])
      .spread((davUrl, token) => request(
        {
          method: 'DELETE',
          headers: { ESNToken: token.token, accept: 'application/json' },
          url: davUrl
        },
        (err, response, body) => {
          if (err || response.statusCode !== 204) {
            logger.error(`Error while request calDav server, a mail will be sent at the resource\'s creator: ${err || response.statusCode} with the message: ${body}`);

            return simpleMailModule(resource.creator, { subject: RESOURCE.ERROR.MAIL.REMOVED.SUBJECT, text: RESOURCE.ERROR.MAIL.REMOVED.MESSAGE });
          }

          logger.info(`Calendar removed for the resource: ${resource._id} with the status: ${response.statusCode}`);
        }
      ));
    }
  }
};
