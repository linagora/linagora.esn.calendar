'use strict';

const Q = require('q');

module.exports = dependencies => {
  const esnConfig = dependencies('esn-config');

  return {
    getLocaleForSystem,
    getLocaleForUser
  };

  function getLocaleForUser(user) {
    return Q.ninvoke(esnConfig('language').inModule('core').forUser(user, true), 'get');
  }

  function getLocaleForSystem() {
    return Q.ninvoke(esnConfig('language').inModule('core'), 'get');
  }
};
