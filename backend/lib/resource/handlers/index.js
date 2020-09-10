const { EVENTS } = require('../../constants');

module.exports = dependencies => {
  const logger = dependencies('logger');
  const { pointToPoint: pointToPointMessaging } = dependencies('messaging');
  const requestHandler = require('./request')(dependencies);
  const acceptedHandler = require('./accepted')(dependencies);
  const declinedHandler = require('./declined')(dependencies);

  return {
    init
  };

  function init() {
    logger.debug('Initializing resources handlers');

    pointToPointMessaging.get(EVENTS.RESOURCE_EVENT.CREATED).receive(requestHandler.handle);
    pointToPointMessaging.get(EVENTS.RESOURCE_EVENT.ACCEPTED).receive(acceptedHandler.handle);
    pointToPointMessaging.get(EVENTS.RESOURCE_EVENT.DECLINED).receive(declinedHandler.handle);
  }
};
