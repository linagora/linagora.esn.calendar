'use strict';

module.exports = dependencies => {
  const pubsub = require('./pubsub')(dependencies);
  const handlers = require('./handlers')(dependencies);

  return {
    listen
  };

  function listen() {
    pubsub.listen();
    handlers.init();
  }
};
