'use strict';

const Q = require('q');

const CONSTANTS = require('../constants');

module.exports = dependencies => {
  const esnConfig = dependencies('esn-config');
  const amqpClientProvider = dependencies('amqpClientProvider');
  const logger = dependencies('logger');
  const userModule = dependencies('user');
  const pubsub = dependencies('pubsub');
  const caldavClient = require('../caldav-client')(dependencies);

  return {
    init
  };

  function init() {
    return _getConfiguration()
      .then(config => {
        if (config && config.exchanges && config.exchanges.length) {
          return config.exchanges.map(_subscribe);
        }
        logger.warn('CalEventMailListener : Missing configuration in mongoDB');

        return _subscribe(CONSTANTS.EVENT_MAIL_LISTENER.FALLBACK_EXCHANGE);
      })
      .catch(() => {
        logger.error('CalEventMailListener : error when initialize the listener');
      });
  }

  function _subscribe(exchange) {
    logger.debug(`CalEventMailListener: registering listener on topic ${exchange}`);
    pubsub.global.topic(exchange).subscribe(_processMessage);

    return Q.when(true);
  }

  function _getConfiguration() {
    return esnConfig('external-event-listener').inModule('linagora.esn.calendar').get();
  }

  function _processMessage(jsonMessage, originalMessage) {
    logger.debug('CalEventMailListener, new message received');
    if (!_checkMandatoryFields(jsonMessage)) {
      logger.warn('CalEventMailListener : Missing mandatory field => Event ignored');

      return;
    }
    logger.debug('CalEventMailListener, handling message ' + jsonMessage.uid);

    userModule.findByEmail(jsonMessage.recipient, (err, user) => {
        if (err) {
          logger.error('CalEventMailListener[' + jsonMessage.uid + '] : Could not connect to UserModule => Event ignored');

          return;
        }

        if (user) {
          _handleMessage(user.id, jsonMessage)
          .then(() => _ackMessage(originalMessage))
          .then(() => {
            logger.debug('CalEventMailListener[' + jsonMessage.uid + '] : Successfully sent to DAV server');
          })
          .catch(err => {
            logger.error('CalEventMailListener[' + jsonMessage.uid + '] : error acknowledging message');
            logger.debug('CalEventMailListener[' + jsonMessage.uid + '] : DAV request Error ' + err + ' ' + err ? err.stack : '');
          });
        } else {
          _ackMessage(originalMessage)
          .then(() => {
            logger.warn('CalEventMailListener[' + jsonMessage.uid + '] : Recipient user unknown in OpenPaas => Event ignored');
          })
          .catch(error => {
            logger.error('CalEventMailListener[' + jsonMessage.uid + '] : error acknowledging message');
            logger.debug(error);
          });
        }
      }
    );
  }

  function _ackMessage(message) {
    return amqpClientProvider.getClient().then(client => client.ack(message));
  }

  function _checkMandatoryFields(jsonMessage = {}) {
    return jsonMessage.method && jsonMessage.sender && jsonMessage.recipient && jsonMessage.uid;
  }

  function _handleMessage(userId, jsonMessage) {
    return caldavClient.iTipRequest(userId, jsonMessage);
  }
};
