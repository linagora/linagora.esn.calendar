'use strict';

const express = require('express');

module.exports = dependencies => {
  const controller = require('./controller')(dependencies),
        authorizationMW = dependencies('authorizationMW'),
        router = express.Router();

  router.get('/next', authorizationMW.requiresAPILogin, controller.getNextEvent);
  router.delete('/next', authorizationMW.requiresAPILogin, controller.cancelNextEvent);

  router.post('/', authorizationMW.requiresAPILogin, controller.newEventInDefaultCalendar);

  return router;
};
