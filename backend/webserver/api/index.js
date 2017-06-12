'use strict';

const express = require('express');

module.exports = dependencies => {
  const router = express.Router();

  router.use('/calendars', require('./calendar')(dependencies));
  router.use('/events', require('./events')(dependencies));

  return router;
};
