module.exports = {
  validateSearchQuery
};

function validateSearchQuery(req, res, next) {
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
