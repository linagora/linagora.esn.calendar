'use strict';

const express = require('express');

module.exports = dependencies => {
  const router = express.Router();

  router.use('/calendars', require('./calendar')(dependencies));
  router.use('/events', require('./events')(dependencies));
  router.use('/resources', require('./resources')(dependencies));

  return router;
};
