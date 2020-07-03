module.exports = dependencies => {
  const { pointToPoint } = dependencies('messaging');
  const { local: pubsubLocal, global: pubsubGlobal } = dependencies('pubsub');
  const { EVENTS: { EVENT }, WEBSOCKET } = require('../constants');

  const localTopic = {
    eventCreatedTopic: pubsubLocal.topic(EVENT.CREATED),
    eventRequestTopic: pubsubLocal.topic(EVENT.REQUEST),
    eventUpdatedTopic: pubsubLocal.topic(EVENT.UPDATED),
    eventReplyTopic: pubsubLocal.topic(EVENT.REPLY),
    eventDeletedTopic: pubsubLocal.topic(EVENT.DELETED),
    eventCancelTopic: pubsubLocal.topic(EVENT.CANCEL)
  };

  const globalTopic = {
    eventCreatedTopic: pubsubGlobal.topic(WEBSOCKET.EVENTS.EVENT_CREATED),
    eventRequestTopic: pubsubGlobal.topic(WEBSOCKET.EVENTS.EVENT_REQUEST),
    eventUpdatedTopic: pubsubGlobal.topic(WEBSOCKET.EVENTS.EVENT_UPDATED),
    eventReplyTopic: pubsubGlobal.topic(WEBSOCKET.EVENTS.EVENT_REPLY),
    eventDeletedTopic: pubsubGlobal.topic(WEBSOCKET.EVENTS.EVENT_DELETED),
    eventCancelTopic: pubsubGlobal.topic(WEBSOCKET.EVENTS.EVENT_CANCEL)
  };

  return {
    listen
  };

  function listen() {
    pointToPoint.get(EVENT.CREATED).receive(onEventCreated);
    pointToPoint.get(EVENT.REQUEST).receive(onEventRequest);
    pointToPoint.get(EVENT.UPDATED).receive(onEventUpdated);
    pointToPoint.get(EVENT.REPLY).receive(onEventReply);
    pointToPoint.get(EVENT.DELETED).receive(onEventDeleted);
    pointToPoint.get(EVENT.CANCEL).receive(onEventCancel);
  }

  function onEventCreated(message) {
    globalTopic.eventCreatedTopic.publish(message);
    localTopic.eventCreatedTopic.publish(message);
  }

  function onEventRequest(message) {
    globalTopic.eventRequestTopic.publish(message);
    localTopic.eventRequestTopic.publish(message);
  }

  function onEventUpdated(message) {
    globalTopic.eventUpdatedTopic.publish(message);
    localTopic.eventUpdatedTopic.publish(message);
  }

  function onEventReply(message) {
    globalTopic.eventReplyTopic.publish(message);
    localTopic.eventReplyTopic.publish(message);
  }

  function onEventDeleted(message) {
    globalTopic.eventDeletedTopic.publish(message);
    localTopic.eventDeletedTopic.publish(message);
  }

  function onEventCancel(message) {
    globalTopic.eventCancelTopic.publish(message);
    localTopic.eventCancelTopic.publish(message);
  }
};
