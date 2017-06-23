'use strict';

module.exports = dependencies => {

  const handler = require('./calendar')(dependencies);

  return {
    notify: handler.notify
  };
};
