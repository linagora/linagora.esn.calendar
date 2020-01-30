'use strict';

const async = require('async');
const Q = require('q');
const getEventUidFromElasticsearchId = require('../../../lib/search/denormalize').getEventUidFromElasticsearchId;

module.exports = dependencies => {
  const eventMessage = require('./../../../lib/message/eventmessage.core')(dependencies);
  const userModule = dependencies('user');
  const collaborationModule = dependencies('collaboration');
  const messageHelpers = dependencies('helpers').message;
  const activityStreamHelper = dependencies('activitystreams').helpers;
  const localpubsub = dependencies('pubsub').local;
  const globalpubsub = dependencies('pubsub').global;
  const collaborationPermission = dependencies('collaboration').permission;
  const elasticsearchActions = require('../../../lib/search/actions')(dependencies);
  const caldavClient = require('../../../lib/caldav-client')(dependencies);

  return {
    dispatch,
    searchEventsBasic
  };

  /**
   * Check if the user has the right to create an eventmessage in that
   * collaboration and create the event message and the timeline entry. The
   * callback function is called with either the saved event message or false if
   * the user doesn't have write permissions.
   *
   * @param {object} user             The user object from req.user
   * @param {object} collaboration    The collaboration object from req.collaboration
   * @param {object} event            The event data, see REST_calendars.md
   * @param {function} callback       The callback function
   */
  function _create(user, collaboration, event, callback) {
    const userData = {objectType: 'user', id: user._id};

    collaborationPermission.canWrite(collaboration, userData, (err, result) => {
      if (err || !result) {
        return callback(err, result);
      }
      const shares = [{
        objectType: 'activitystream',
        id: collaboration.activity_stream.uuid
      }];

      eventMessage.save({eventId: event.event_id, author: user, shares: shares}, (err, saved) => {
        if (err) {
          return callback(err);
        }

        const targets = messageHelpers.messageSharesToTimelineTarget(saved.shares);
        const activity = activityStreamHelper.userMessageToTimelineEntry(saved, 'post', user, targets);

        localpubsub.topic('message:activity').forward(globalpubsub, activity);

        callback(null, saved);
      });
    });
  }

  /**
   * Update the event message belonging to the specified calendar event
   *
   * @param {object} user             The user object from req.user
   * @param {object} collaboration    The collaboration object from req.collaboration
   * @param {object} event            The event data, see REST_calendars.md
   * @param {function} callback       The callback function
   */
  function _update(user, collaboration, event, callback) {
    eventMessage.findByEventId(event.event_id, (err, message) => {
      if (err) {
        return callback(err);
      }
      if (!message) {
        return callback(new Error('Could not find matching event message'));
      }

      // For now all we will do is send a new message:activity notification, but
      // with verb |update| instead of |post| to denote the update.
      const targets = messageHelpers.messageSharesToTimelineTarget(message.shares);
      const activity = activityStreamHelper.userMessageToTimelineEntry(message, 'update', user, targets);

      localpubsub.topic('message:activity').forward(globalpubsub, activity);

      callback(null, message);
    });
  }

  /**
   * Validate the data structure and forward it to the right handler. This method
   * can be used to process message queue data. The message data format is as
   * follows:
   *   {
   *     user: "userid", // This can be the user id or a user object
   *     collaboration: "collabid", // This can be the collab id or object
   *     event: {  // The message event data
   *       event_id: '/path/to/event', // An event identifier
   *       type: 'created', // The operation to execute
   *       event: 'BEGIN:VCALENDAR...', /// The event ics data
   *     }
   *   }
   *
   * The callback result is false if there was a permission issue. Otherwise it
   * is an object with the event message data created or updated.
   *
   * @param {object} data         The data which contain the user, the community
   *                                and the event
   * @param {function} callback   Callback function for results: function(err, result)
   */
  function dispatch(data, callback) {
    if (!data || typeof data !== 'object') {
      return callback(new Error('Data is missing'));
    }
    if (!data.user) {
      return callback(new Error('Invalid user specified'));
    }
    if (!data.collaboration) {
      return callback(new Error('Invalid collaboration specified'));
    }
    if (!data.event || !data.event.event_id) {
      return callback(new Error('Invalid event specified'));
    }

    const retrievals = [
      function retrieveUser(callback) {
        if (typeof data.user === 'object') {
          return callback(null, data.user);
        } else if (typeof data.user === 'string') {
          userModule.get(data.user, callback);
        } else {
          callback('Invalid user data');
        }
      },
      function retrieveCollaboration(callback) {
        if (typeof data.collaboration === 'object') {
          return callback(null, data.collaboration);
        } else if (typeof data.collaboration === 'string' && data.objectType) {
          collaborationModule.queryOne(data.objectType, data.collaboration, callback);
        } else {
          callback('Missing collaboration');
        }
      }
    ];

    async.parallel(retrievals, (err, result) => {
      if (err) {
        return callback(new Error('Error dispatching event: ' + err));
      }
      data.user = result[0]; data.collaboration = result[1];

      switch (data.event.type) {
        case 'created':
          return _create(data.user, data.collaboration, data.event, callback);
        case 'updated':
          return _update(data.user, data.collaboration, data.event, callback);
        default:
          return callback(new Error('Invalid type specified'));
      }
    });
  }

  function searchEventsBasic(query) {
    return Q.ninvoke(elasticsearchActions, 'searchEventsBasic', query)
      .then(esResult => ({
        totalCount: esResult.total_count,
        events: esResult.list.map(event => ({
          path: caldavClient.getEventPath(event._source.userId, event._source.calendarId, getEventUidFromElasticsearchId(event._id)),
          data: event._source
        }))
      }));
  }
};
