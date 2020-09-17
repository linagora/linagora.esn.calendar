const CONSTANTS = require('../constants');

module.exports = dependencies => {
  const esnConfig = dependencies('esn-config');
  const pointToPointMessaging = dependencies('messaging').pointToPoint;
  const logger = dependencies('logger');
  const userModule = dependencies('user');
  const caldavClient = require('../caldav-client')(dependencies);

  return {
    init
  };

  function init() {
    logger.info('CalEventMailListener: Initializing...');

    return _getConfiguration()
      .then(config => {
        if (config && config.exchanges && config.exchanges.length) {
          return config.exchanges.map(_subscribe);
        }
        logger.info(`CalEventMailListener : Missing configuration in mongoDB, fallback to default ${CONSTANTS.EVENT_MAIL_LISTENER.FALLBACK_EXCHANGE}`);

        return _subscribe(CONSTANTS.EVENT_MAIL_LISTENER.FALLBACK_EXCHANGE);
      })
      .catch(err => {
        logger.error('CalEventMailListener: error when initialize the listener', err);
      });
  }

  function _subscribe(exchange) {
    logger.debug(`CalEventMailListener: registering listener on exchange ${exchange}`);

    return pointToPointMessaging.get(exchange).receive(_processMessage);
  }

  function _getConfiguration() {
    return esnConfig('external-event-listener').inModule('linagora.esn.calendar').get();
  }

  function _processMessage(message) {
    logger.debug('CalEventMailListener, new message received');

    if (!_checkMandatoryFields(message)) {
      logger.warn('CalEventMailListener : Missing some mandatory fields, event ignored');

      return;
    }

    logger.debug(`CalEventMailListener[${message.uid}] : Processing message`);

    userModule.findByEmail(message.recipient, (err, user) => {
      if (err) {
        logError('Error while searching user from email, skipping event')(err);

        return;
      }

      if (user) {
        return caldavClient.iTipRequest(user.id, message)
          .then(() => logger.debug(`CalEventMailListener[${message.uid}] : Successfully sent to DAV server`))
          .catch(logError('Error handling message'));
      }

      logger.warn(`CalEventMailListener[${message.uid}] : Recipient user unknown in OpenPaas ${message.recipient}, skipping event`);

      function logError(msg) {
        return err => {
          logger.error(`CalEventMailListener[${message.uid}] : ${msg}`, err && err.message);
          logger.debug(`CalEventMailListener[${message.uid}]`, err);
        };
      }
    });
  }

  function _checkMandatoryFields(message = {}) {
    return message.method && message.sender && message.recipient && message.uid;
  }
};
