'use strict';

module.exports = dependencies => {
  const logger = dependencies('logger');
  const userModule = dependencies('user');

  return {
    decodeJWT,
    checkUserParameter,
    validateAdvancedSearchQuery
  };

  function decodeJWT(req, res, next) {
    const payload = req.user;
    let badRequest;

    if (!payload.calendarURI) {
      badRequest = 'Calendar ID is required';
    }
    if (!payload.uid) {
      badRequest = 'Event uid is required';
    }
    if (!payload.attendeeEmail) {
      badRequest = 'Attendee email is required';
    }
    if (!payload.action) {
      badRequest = 'Action is required';
    }
    if (!payload.organizerEmail) {
      badRequest = 'Organizer email is required';
    }
    if (badRequest) {
      return res.status(400).json({error: {code: 400, message: 'Bad request', details: badRequest}});
    }

    userModule.findByEmail(payload.organizerEmail, (err, organizer) => {
      if (err) {
        logger.error('Error while searching event organizer.', err);

        return res.status(500).json({error: {code: 500, message: 'Internal Server Error', details: 'Error while searching for the event organizer'}});
      }

      if (!organizer) {
        return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'Organizer email is not valid.'}});
      }

      req.eventPayload = payload;
      req.user = organizer;
      next();
    });
  }

  function checkUserParameter(req, res, next) {
    if (req.query.query && req.params.userId !== req.user.id) {
      return res.status(403).json({
        error: {
          code: 403,
          message: 'Forbidden',
          details: 'User do not have the required privileges for this calendarHome'
        }
      });
    }

    next();
  }

  function validateAdvancedSearchQuery(req, res, next) {
    if (typeof req.body.query !== 'string') {
      return res.status(400).json({
        error: {
          code: 400,
          message: 'Bad Request',
          details: 'You must provide a valid query string to search'
        }
      });
    }

    if (!Array.isArray(req.body.calendars)) {
      return res.status(400).json({
        error: {
          code: 400,
          message: 'Error while searching for events',
          details: 'You must provide a valid calendar array to search'
        }
      });
    }

    if (!req.body.calendars.length || !req.body.query.length) {
      res.header('X-ESN-Items-Count', 0);

      return res.status(200).json({
        _links: {
          self: {
            href: req.originalUrl
          }
        },
        _total_hits: 0,
        _embedded: {
          'dav:item': []
        }
      });
    }

    next();
  }
};
