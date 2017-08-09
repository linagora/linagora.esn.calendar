'use strict';

const express = require('express');

module.exports = dependencies => {
  const controller = require('./controller')(dependencies),
        authorizationMW = dependencies('authorizationMW'),
        router = express.Router();

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
  router.get('/next', authorizationMW.requiresAPILogin, controller.getNextEvent);

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
  router.delete('/next', authorizationMW.requiresAPILogin, controller.cancelNextEvent);

  /**
   * @swagger
   * /:
   *   post:
   *     tags:
   *       - Event
   *     description: creates new event in default calendar.
   *     parameters:
   *       - $ref: "#/parameters/event_when"
   *       - $ref: "#/parameters/event_summany"
   *       - $ref: "#/parameters/event_location"
   *     responses:
   *       200:
   *         $ref: "#/responses/cm_200"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.post('/', authorizationMW.requiresAPILogin, controller.newEventInDefaultCalendar);

  return router;
};
