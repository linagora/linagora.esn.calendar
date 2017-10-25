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
      yes: `${baseUrl}/calendar/api/resources/${resourceId}/${eventId.replace(/\.ics$/, '')}/participation?status=ACCEPTED&referrer=${referer}`,
      no: `${baseUrl}/calendar/api/resources/${resourceId}/${eventId.replace(/\.ics$/, '')}/participation?status=DECLINED&referrer=${referer}`
    }));
  }

  function getCalendarUrl(resourceId) {
    // davserverUtils.getDavEndpoint does not follow the callback(err) way but callback(url)...
    return new Promise(resolve => davserverUtils.getDavEndpoint(davserver => resolve(`${davserver}/calendars/${resourceId}.json`)));
  }

  function getEventUrl(resourceId, eventId) {
    return new Promise(resolve => davserverUtils.getDavEndpoint(davserver => resolve(`${davserver}/calendars/${resourceId}/${resourceId}/${eventId.replace(/\.ics$/, '')}.ics`)));
  }
};
