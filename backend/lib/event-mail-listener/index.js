const CONSTANTS = require('../constants');

module.exports = dependencies => {
  const esnConfig = dependencies('esn-config');
  const amqpClientProvider = dependencies('amqpClientProvider');
  const logger = dependencies('logger');
  const userModule = dependencies('user');
  const caldavClient = require('../caldav-client')(dependencies);
  let amqpClient;

  return {
    init
  };

  function init() {
    return _getConfiguration()
      .then(config => {
        if (config && config.exchanges && config.exchanges.length) {
          return config.exchanges.map(_subscribe);
        }
        logger.info(`CalEventMailListener : Missing configuration in mongoDB, fallback to default ${CONSTANTS.EVENT_MAIL_LISTENER.FALLBACK_EXCHANGE}`);

        return _subscribe(CONSTANTS.EVENT_MAIL_LISTENER.FALLBACK_EXCHANGE);
      })
      .catch(() => {
        logger.error('CalEventMailListener : error when initialize the listener');
      });
  }

  function _subscribe(exchange) {
    logger.debug(`CalEventMailListener: registering listener on exchange ${exchange}`);

    return amqpClientProvider.getClient()
      .then(client => (amqpClient = client))
      // For simplicity, queue name is the same as the exchange one
      .then(() => amqpClient.subscribeToDurableQueue(exchange, exchange, _processMessage))
      .catch(err => logger.error(`Can not setup AMQP client to process '${exchange}' exchanges. Emails will not be processed correctly until a new subsriber is up and running`, err));
  }

  function _getConfiguration() {
    return esnConfig('external-event-listener').inModule('linagora.esn.calendar').get();
  }

  function _processMessage(jsonMessage, originalMessage) {
    logger.debug('CalEventMailListener, new message received');
    if (!_checkMandatoryFields(jsonMessage)) {
      logger.warn('CalEventMailListener : Missing some mandatory fields, event ignored');

      return;
    }
    logger.debug(`CalEventMailListener[${jsonMessage.uid}] : Processing message`);

    userModule.findByEmail(jsonMessage.recipient, (err, user) => {
      if (err) {
        logError('Error while searching user from email, skipping event')(err);

        return;
      }

      if (user) {
        return _handleMessage(user.id, jsonMessage)
          .then(() => _ackMessage(originalMessage))
          .then(() => logger.debug(`CalEventMailListener[${jsonMessage.uid}] : Successfully sent to DAV server`))
          .catch(logError('Error handling message'));
      }

      _ackMessage(originalMessage)
        .then(() => logger.warn(`CalEventMailListener[${jsonMessage.uid}] : Recipient user unknown in OpenPaas ${jsonMessage.recipient}, skipping event`))
        .catch(logError('Error acknowledging message'));

      function logError(msg) {
        return err => {
          logger.error(`CalEventMailListener[${jsonMessage.uid}] : ${msg}`, err.message);
          logger.debug(`CalEventMailListener[${jsonMessage.uid}]`, err);
        };
      }
    });
  }

  function _ackMessage(message) {
    return amqpClient ? Promise.resolve(amqpClient.ack(message)) : Promise.reject(new Error('No client available to ack message'));
  }

  function _checkMandatoryFields(jsonMessage = {}) {
    return jsonMessage.method && jsonMessage.sender && jsonMessage.recipient && jsonMessage.uid;
  }

  function _handleMessage(userId, jsonMessage) {
    return caldavClient.iTipRequest(userId, jsonMessage);
  }
};
