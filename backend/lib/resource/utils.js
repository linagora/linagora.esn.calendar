const Q = require('q');

module.exports = dependencies => {
  const helpers = dependencies('helpers');
  const davserverUtils = dependencies('davserver').utils;

  return {
    generateValidationLinks,
    getCalendarUrl,
    getEventUrl
  };

  function generateValidationLinks(resourceId, eventId) {
    return Q.nfcall(helpers.config.getBaseUrl, null).then(baseUrl => ({
      yes: `${baseUrl}/calendar/api/resources/${resourceId}/${eventId}/participation?status=ACCEPTED`,
      no: `${baseUrl}/calendar/api/resources/${resourceId}/${eventId}/participation?status=DECLINED`
    }));
  }

  function getCalendarUrl(resourceId) {
    return Q.denodeify(davserverUtils.getDavEndpoint)(null).then(davserver => (`${davserver}/calendars/${resourceId}.json`));
  }

  function getEventUrl(resourceId, eventId) {
    return Q.denodeify(davserverUtils.getDavEndpoint)(null).then(davserver => (`${davserver}/calendars/${resourceId}/${eventId}.ics`));
  }
};
