'use strict';

module.exports = dependencies => {
  const logger = dependencies('logger');
  const listener = require('./searchHandler')(dependencies);
  const pubsub = require('./pubsub')(dependencies);

  return {
    listen
  };

  function listen() {
    logger.info('Subscribing to event updates for indexing');
    pubsub.listen();
    listener.register();

    logger.info('Register reindexing for calendar events');
    require('./reindex')(dependencies).register();
  }
};
