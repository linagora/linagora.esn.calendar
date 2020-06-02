const { EVENTS } = require('../../constants');

module.exports = dependencies => {
  const logger = dependencies('logger');
  const { pointToPoint: pointToPointMessaging } = dependencies('messaging');
  const amqpClientProvider = dependencies('amqpClientProvider');
  const requestHandler = require('./request')(dependencies);
  const acceptedHandler = require('./accepted')(dependencies);
  const declinedHandler = require('./declined')(dependencies);

  return {
    init
  };

  function init() {
    logger.debug('Initializing resources handlers');

    pointToPointMessaging.get(EVENTS.RESOURCE_EVENT.CREATED).receive(handleEvent(requestHandler.handle));
    pointToPointMessaging.get(EVENTS.RESOURCE_EVENT.ACCEPTED).receive(handleEvent(acceptedHandler.handle));
    pointToPointMessaging.get(EVENTS.RESOURCE_EVENT.DECLINED).receive(handleEvent(declinedHandler.handle));

    function handleEvent(handler) {
      return (jsonMessage, { ack } = {}) => handler(jsonMessage)
        .then(amqpClientProvider.getClient)
        .then(() => typeof ack === 'function' && ack())
        .catch(err => {
          logger.error(`CAlResourceRequestHandler[${jsonMessage.uid}] Error`, err);
          throw err;
        });
    }
  }
};
