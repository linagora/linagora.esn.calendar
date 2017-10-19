const CONSTANTS = require('../../constants');

module.exports = dependencies => {
  const logger = dependencies('logger');
  const amqpClientProvider = dependencies('amqpClientProvider');
  const requestHandler = require('./request')(dependencies);
  const acceptedHandler = require('./accepted')(dependencies);
  const declinedHandler = require('./declined')(dependencies);
  let amqpClient;

  return {
    init
  };

  function init() {
    logger.debug('Initializing resources handlers');

    return amqpClientProvider.getClient()
      .then(client => {
        amqpClient = client;
        amqpClient.subscribe(CONSTANTS.EVENTS.RESOURCE_EVENT.CREATED, handleEvent(requestHandler.handle));
        amqpClient.subscribe(CONSTANTS.EVENTS.RESOURCE_EVENT.ACCEPTED, handleEvent(acceptedHandler.handle));
        amqpClient.subscribe(CONSTANTS.EVENTS.RESOURCE_EVENT.DECLINED, handleEvent(declinedHandler.handle));
      })
      .catch(err => {
        logger.error('The AMQP client can not be created, resource calendars may not work properly', err);
        throw err;
      });

      function handleEvent(handler) {
        return (jsonMessage, originalMessage) => handler(jsonMessage)
          .then(response => {
            logger.debug(`CAlResourceRequestHandler[${jsonMessage.uid}] Successfully processed`);
            amqpClient.ack(originalMessage);

            return response;
          })
          .catch(err => {
            logger.error(`CAlResourceRequestHandler[${jsonMessage.uid}] Error`, err);
            throw err;
          });
      }
  }
};
