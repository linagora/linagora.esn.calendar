const express = require('express');

module.exports = (dependencies, moduleName) => {
  const controller = require('./controller')(dependencies);
  const resourceMW = require('./middleware')(dependencies);
  const authorizationMW = dependencies('authorizationMW');
  const moduleMW = dependencies('moduleMW');
  const davMiddleware = dependencies('davserver').davMiddleware;
  const router = express.Router();

  router.all('/*',
    authorizationMW.requiresAPILogin,
    moduleMW.requiresModuleIsEnabledInCurrentDomain(moduleName)
  );

  /**
   * @swagger
   * /:resourceId/:eventId/participation:
   *   put:
   *     tags:
   *       - Resource
   *     description: Update participation status of a specific resource
   *     parameters:
   *       - $ref: "#/parameters/calendar_event_id"
   *       - $ref: "#/parameters/calendar_resource_id"
   *       - $ref: "#/parameters/calendar_participation_status"
   *     responses:
   *       204:
   *         $ref: "#/responses/cm_204"
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
  router.put('/:resourceId/:eventId/participation',
    resourceMW.requiresStatusQueryParameter,
    resourceMW.load,
    resourceMW.requiresCurrentUserAsAdministrator,
    resourceMW.getTechnicalUserToken,
    davMiddleware.getDavEndpoint,
    controller.changeParticipation);

  return router;
};
