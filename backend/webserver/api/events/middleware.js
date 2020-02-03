const { SORT } = require('./constants').SEARCH;

module.exports = {
  validateSearchPayload,
  validateSearchQuery
};

function validateSearchQuery(req, res, next) {
  const { sortKey, sortOrder } = req.query;

  if (sortKey && SORT.KEYS.indexOf(sortKey) === -1) {
    return res.status(400).json({
      error: {
        code: 400,
        message: 'Bad Request',
        details: 'Sort key is invalid. Valid values are: start, end.'
      }
    });
  }

  if (sortOrder && SORT.ORDERS.indexOf(sortOrder) === -1) {
    return res.status(400).json({
      error: {
        code: 400,
        message: 'Bad Request',
        details: 'Sort order is invalid. Valid values are: asc, desc.'
      }
    });
  }

  return next();
}

function validateSearchPayload(req, res, next) {
  const { query, calendars } = req.body;

  if (typeof query !== 'string') {
    return res.status(400).json({
      error: {
        code: 400,
        message: 'Bad Request',
        details: 'You must provide a valid query string to search'
      }
    });
  }

  if (!Array.isArray(calendars)) {
    return res.status(400).json({
      error: {
        code: 400,
        message: 'Error while searching for events',
        details: 'You must provide a valid calendar array to search'
      }
    });
  }

  if (!calendars.length || !query.length) {
    res.header('X-ESN-Items-Count', 0);

    return res.status(200).json({
      _links: {
        self: {
          href: req.originalUrl
        }
      },
      _total_hits: 0,
      _embedded: {
        events: []
      }
    });
  }

  next();
}
