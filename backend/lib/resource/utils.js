const Q = require('q');

module.exports = dependencies => {
  const helpers = dependencies('helpers');

  return {
    generateValidationLinks
  };

  function generateValidationLinks(resourceId, eventId) {
    return Q.nfcall(helpers.config.getBaseUrl, null).then(baseUrl => ({
      yes: `${baseUrl}/calendar/api/resources/${resourceId}/${eventId}/participation?status=ACCEPTED`,
      no: `${baseUrl}/calendar/api/resources/${resourceId}/${eventId}/participation?status=DECLINED`
    }));
  }
};
