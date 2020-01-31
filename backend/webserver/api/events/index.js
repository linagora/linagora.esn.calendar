'use strict';

const express = require('express');

module.exports = (dependencies, moduleName) => {
  const controller = require('./controller')(dependencies);
  const authorizationMW = dependencies('authorizationMW');
  const moduleMW = dependencies('moduleMW');
  const eventsMW = require('./middleware');
  const router = express.Router();

  router.all('/*',
    authorizationMW.requiresAPILogin,
    moduleMW.requiresModuleIsEnabledInCurrentDomain(moduleName)
  );

  /**
   * @swagger
   * /next:
   *   get:
   *     tags:
   *       - Event
   *     description: gets next event
   *     responses:
   *       200:
   *         $ref: "#/responses/event_next_event"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       404:
   *         $ref: "#/responses/cm_404"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.get('/next', controller.getNextEvent);

  /**
   * @swagger
   * /next:
   *   delete:
   *     tags:
   *       - Event
   *     description: Cancels a next event
   *     responses:
   *       200:
   *         $ref: "#/responses/cm_200"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       404:
   *         $ref: "#/responses/cm_404"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.delete('/next', controller.cancelNextEvent);

  /**
   * @swagger
   * /:
   *   post:
   *     tags:
   *       - Event
   *     description: creates new event in default calendar.
   *     parameters:
   *       - $ref: "#/parameters/calendar_event_when"
   *       - $ref: "#/parameters/calendar_event_summany"
   *       - $ref: "#/parameters/calendar_event_location"
   *     responses:
   *       200:
   *         $ref: "#/responses/cm_200"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.post('/', controller.newEventInDefaultCalendar);

  /**
   * @swagger
   * /search:
   *   post:
   *     tags:
   *       - Event
   *     description: Search for events in Elasticsearch
   *     parameters:
   *       - $ref: "#/parameters/calendar_event_search"
   *       - $ref: "#/parameters/cm_limit"
   *       - $ref: "#/parameters/cm_offset"
   *       - $ref: "#/parameters/calendar_event_sort_key"
   *       - $ref: "#/parameters/calendar_event_sort_order"
   *     responses:
   *       200:
   *         $ref: "#/responses/calendar_events"
   *       400:
   *         $ref: "#/responses/cm_400"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.post('/search',
    authorizationMW.requiresAPILogin,
    eventsMW.validateSearchQuery,
    eventsMW.validateSearchPayload,
    controller.search);

  return router;
};
