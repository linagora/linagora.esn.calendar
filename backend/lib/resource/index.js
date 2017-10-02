'use strict';

module.exports = dependencies => {
  const pubsub = require('./pubsub')(dependencies);

  return {
    listen
  };

  function listen() {
    pubsub.listen();
  }
};
