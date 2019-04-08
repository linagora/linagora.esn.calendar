'use strict';

var express = require('express');

module.exports = (dependencies, moduleName) => {
  const controller = require('./controller')(dependencies);
  const calendarMW = require('./middleware')(dependencies);
  const authorizationMW = dependencies('authorizationMW');
  const collaborationMW = dependencies('collaborationMW');
  const domainMW = dependencies('domainMW');
  const davMiddleware = dependencies('davserver').davMiddleware;
  const tokenMW = dependencies('tokenMW');
  const moduleMW = dependencies('moduleMW');
  const router = express.Router();

  /**
   * @swagger
   * /{objectType}/{id}/events :
   *   post:
   *     tags:
   *       - Calendar
   *     description: Creates a calendar event (called by the CalDAV server).
   *     parameters:
   *       - $ref: "#/parameters/calendar_user_id"
   *       - $ref: "#/parameters/calendar_collaboration_id"
   *       - $ref: "#/parameters/calendar_collabortion_object_type"
   *       - $ref: "#/parameters/calendar_calendar_id"
   *       - $ref: "#/parameters/calendar_calendar_event"
   *     responses:
   *       201:
   *         $ref: "#/responses/calendar_result"
   *       400:
   *         $ref: "#/responses/cm_400"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       403:
   *         $ref: "#/responses/cm_403"
   *       404:
   *         $ref: "#/responses/cm_404"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.post('/:objectType/:id/events',
    authorizationMW.requiresAPILogin,
    collaborationMW.load,
    collaborationMW.requiresCollaborationMember,
    controller.dispatchEvent);

  router.post('/inviteattendees', (req, res) => res.redirect('/calendar/api/calendars/event/invite'));

  router.all('/event/invite*',
    authorizationMW.requiresAPILogin,
    moduleMW.requiresModuleIsEnabledInCurrentDomain(moduleName)
  );

  /**
   * @swagger
   * /event/invite:
   *   post:
   *     tags:
   *       - Calendar
   *     description: Creates notification for specified attendees (called by the CalDAV server).
   *     parameters:
   *       - $ref: "#/parameters/calendar_invite"
   *     responses:
   *       200:
   *         $ref: "#/responses/cm_200"
   *       400:
   *         $ref: "#/responses/cm_400"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.post('/event/invite',
    domainMW.loadSessionDomain,
    controller.sendInvitation);

  /**
   * @swagger
   * /event/participation:
   *   get:
   *     tags:
   *       - Calendar
   *     description: Updates the attendee participation to an event (used by links in invitation emails).
   *     parameters:
   *       - $ref: "#/parameters/calendar_user_calendar_URI"
   *       - $ref: "#/parameters/calendar_user_id"
   *       - $ref: "#/parameters/calendar_user_uid"
   *       - $ref: "#/parameters/calendar_user_attendee_email"
   *       - $ref: "#/parameters/calendar_user_action"
   *       - $ref: "#/parameters/calendar_user_organizer_email"
   *       - $ref: "#/parameters/calendar_token"
   *     responses:
   *       200:
   *         $ref: "#/responses/cm_200"
   *       400:
   *         $ref: "#/responses/cm_400"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.get('/event/participation',
    authorizationMW.requiresJWT,
    calendarMW.decodeJWT,
    tokenMW.generateNewToken(),
    davMiddleware.getDavEndpoint,
    controller.changeParticipation);

  /**
   * @swagger
   * /{userId}/{calendarId}/events.json:
   *   get:
   *     tags:
   *       - Calendar
   *     description: Searchs for events in Elasticsearch
   *     parameters:
   *       - $ref: "#/parameters/calendar_calendar_id"
   *       - $ref: "#/parameters/calendar_sort_key"
   *       - $ref: "#/parameters/cm_limit"
   *       - $ref: "#/parameters/cm_offset"
   *       - $ref: "#/parameters/cm_search"
   *       - $ref: "#/parameters/calendar_sort_order"
   *       - $ref: "#/parameters/calendar_user_id"
   *     responses:
   *       200:
   *         $ref: "#/responses/calendar_events"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.get('/:userId/:calendarId/events.json',
    authorizationMW.requiresAPILogin,
    calendarMW.checkUserParameter,
    controller.searchEvents);

  return router;
};
