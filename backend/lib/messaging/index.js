module.exports = dependencies => {
  const { pointToPoint } = dependencies('messaging');
  const { local: pubsubLocal } = dependencies('pubsub');
  const { EVENTS: { EVENT } } = require('../constants');

  const eventCreatedTopic = pubsubLocal.topic(EVENT.CREATED);
  const eventRequestTopic = pubsubLocal.topic(EVENT.REQUEST);
  const eventUpdatedTopic = pubsubLocal.topic(EVENT.UPDATED);
  const eventReplyTopic = pubsubLocal.topic(EVENT.REPLY);
  const eventDeletedTopic = pubsubLocal.topic(EVENT.DELETED);
  const eventCancelTopic = pubsubLocal.topic(EVENT.CANCEL);

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
    eventCreatedTopic.publish(message);
  }

  function onEventRequest(message) {
    eventRequestTopic.publish(message);
  }

  function onEventUpdated(message) {
    eventUpdatedTopic.publish(message);
  }

  function onEventReply(message) {
    eventReplyTopic.publish(message);
  }

  function onEventDeleted(message) {
    eventDeletedTopic.publish(message);
  }

  function onEventCancel(message) {
    eventCancelTopic.publish(message);
  }
};
