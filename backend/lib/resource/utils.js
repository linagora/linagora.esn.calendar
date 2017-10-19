const Q = require('q');

module.exports = dependencies => {
  const helpers = dependencies('helpers');
  const davserverUtils = dependencies('davserver').utils;

  return {
    generateValidationLinks,
    getCalendarUrl,
    getEventUrl
  };

  function generateValidationLinks(resourceId, eventId, referer) {
    return Q.nfcall(helpers.config.getBaseUrl, null).then(baseUrl => ({
      yes: `${baseUrl}/calendar/api/resources/${resourceId}/${eventId}/participation?status=ACCEPTED&referrer=${referer}`,
      no: `${baseUrl}/calendar/api/resources/${resourceId}/${eventId}/participation?status=DECLINED&referrer=${referer}`
    }));
  }

  function getCalendarUrl(resourceId) {
    return Q.denodeify(davserverUtils.getDavEndpoint)(null).then(davserver => (`${davserver}/calendars/${resourceId}.json`));
  }

  function getEventUrl(resourceId, eventId) {
    return Q.denodeify(davserverUtils.getDavEndpoint)(null).then(davserver => (`${davserver}/calendars/${resourceId}/${eventId}.ics`));
  }
};
