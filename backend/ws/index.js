'use strict';

const {EVENTS, WEBSOCKET} = require('../lib/constants');
const _ = require('lodash');
let initialized = false;

module.exports = {
  init
};

function init(dependencies) {
  const logger = dependencies('logger');
  const pubsub = dependencies('pubsub');
  const io = dependencies('wsserver').io;
  const eventHandler = require('./handlers/event')(dependencies);
  const calendarHandler = require('./handlers/calendar')(dependencies);
  const subscriptionHandler = require('./handlers/subscription')(dependencies);

  if (initialized) {
    logger.warn('The calendar notification service is already initialized');

    return;
  }

  _.forOwn(WEBSOCKET.EVENTS, topic => {
    logger.debug(`Subscribing to ${topic} local topic for calendar events operations`);
    pubsub.global.topic(topic).subscribe(msg => {
      logger.debug(`Received a message on global topic ${topic} for calendar websocket sevents operations`, msg);
      const notifyingTopic = getNotifyingTopic(topic);

      notifyingTopic && eventHandler.notify(notifyingTopic, msg);
    });
  });

  _.forOwn(EVENTS.CALENDAR, topic => {
    logger.debug(`Subscribing to ${topic} global topic for calendar related operations`);
    pubsub.global.topic(topic).subscribe(msg => {
      logger.debug(`Received a message on global topic ${topic} for calendar related operations`, msg);
      calendarHandler.notify(topic, msg);
    });
  });

  _.forOwn(EVENTS.SUBSCRIPTION, topic => {
    logger.debug(`Subscribing to ${topic} global topic for calendar subscription operations`);
    pubsub.global.topic(topic).subscribe(msg => {
      logger.debug(`Received a message on global topic ${topic} for calendar subscription operations`, msg);
      subscriptionHandler.notify(topic, msg);
    });
  });

  io.of(WEBSOCKET.NAMESPACE)
    .on('connection', socket => {
      logger.info('New connection on', WEBSOCKET.NAMESPACE);

      socket.on('subscribe', uuid => {
        logger.info('Joining room', uuid);
        socket.join(uuid);
      });

      socket.on('unsubscribe', uuid => {
        logger.info('Leaving room', uuid);
        socket.leave(uuid);
      });
    });
  initialized = true;
}

/**
 * This function will take input as a websocket topic, map it with the corresponding calendar event topic to publish to client.
 * @param {string} topic: Websocket topic name
 */
function getNotifyingTopic(topic) {
  switch (topic) {
    case WEBSOCKET.EVENTS.EVENT_CREATED:
      return EVENTS.EVENT.CREATED;
    case WEBSOCKET.EVENTS.EVENT_UPDATED:
      return EVENTS.EVENT.UPDATED;
    case WEBSOCKET.EVENTS.EVENT_CANCEL:
      return EVENTS.EVENT.CANCEL;
    case WEBSOCKET.EVENTS.EVENT_REPLY:
      return EVENTS.EVENT.REPLY;
    case WEBSOCKET.EVENTS.EVENT_DELETED:
      return EVENTS.EVENT.DELETED;
    case WEBSOCKET.EVENTS.EVENT_REQUEST:
      return EVENTS.EVENT.REQUEST;
    default:
      return;
  }
}
