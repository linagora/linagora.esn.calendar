const TECHNICAL_USER_TYPE = 'dav';
const TOKEN_TTL = 20000;

module.exports = dependencies => {
  const logger = dependencies('logger');
  const resourceModule = dependencies('resource');
  const technicalUserModule = dependencies('technical-user');

  return {
    getTechnicalUserToken,
    load,
    requiresCurrentUserAsAdministrator,
    requiresStatusQueryParameter
  };

  function getTechnicalUserToken(req, res, next) {
    technicalUserModule.findByTypeAndDomain(TECHNICAL_USER_TYPE, req.user.preferredDomainId, (err, users) => {
      if (err) {
        const details = 'Error while getting technical user';

        logger.error(details, err);

        return res.status(500).json({error: {status: 500, message: 'Server Error', details}});
      }

      if (!users || !users.length) {
        return res.status(404).json({error: {status: 404, message: 'Not found', details: 'Can not find technical user for resource management'}});
      }

      technicalUserModule.getNewToken(users[0], TOKEN_TTL, (err, token) => {
        if (err) {
          const details = 'Error while generating technical user token';

          logger.error(details, err);

          return res.status(500).json({error: {status: 500, message: 'Server Error', details}});
        }

        if (!token) {
          const details = 'Can not generate technical user token';

          logger.error(details, err);

          return res.status(500).json({error: {status: 500, message: 'Server Error', details}});
        }

        req.token = token;

        next();
      });
    });
  }

  function load(req, res, next) {
    resourceModule.lib.resource.get(req.params.resourceId)
      .then(resource => {
        if (!resource) {
          return res.status(404).json({error: {status: 404, message: 'Not found', details: `resource ${req.params.resourceId} has not been found`}});
        }

        req.resource = resource;
        next();
      })
      .catch(err => {
        const details = 'Error while getting the resource';

        logger.error(details, err);
        res.status(500).json({error: {status: 500, message: 'Server Error', details}});
      });
  }

  function requiresStatusQueryParameter(req, res, next) {
    if (!req.query.status) {
      return res.status(400).json({error: {status: 400, message: 'Bad request', details: '?status is required'}});
    }

    next();
  }

  function requiresCurrentUserAsAdministrator(req, res, next) {
    resourceModule.lib.administrator.resolve(req.resource)
      .then(administrators => {
        if (!administrators || !administrators.length) {
          return res.status(400).json({error: {status: 400, message: 'Bad request', details: 'Can not manage such resource'}});
        }

        if (!administrators.find(administrator => String(administrator._id) === String(req.user._id))) {
          return res.status(403).json({error: {status: 403, message: 'Forbidden', details: 'Can not manage such resource'}});
        }

        next();
      }).catch(err => {
        const details = 'Error while getting resource administrators';

        logger.error(details, err);
        res.status(500).json({error: {status: 500, message: 'Server Error', details}});
      });
  }
};
