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

  router.get('/:resourceId/:eventId/participation',
    resourceMW.requiresStatusQueryParameter,
    resourceMW.load,
    resourceMW.requiresCurrentUserAsAdministrator,
    resourceMW.getTechnicalUserToken,
    davMiddleware.getDavEndpoint,
    controller.changeParticipation);

  return router;
};
