'use strict';

const express = require('express');

module.exports = dependencies => {
  const router = express.Router();
  const moduleName = 'linagora.esn.calendar';

  router.use('/calendars', require('./calendar')(dependencies, moduleName));
  router.use('/events', require('./events')(dependencies, moduleName));
  router.use('/resources', require('./resources')(dependencies, moduleName));

  return router;
};
