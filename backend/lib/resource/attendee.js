const ICAL = require('ical.js');
const helpers = require('./helpers');
const jcalHelper = require('../helpers/jcal');

module.exports = dependencies => {
  const caldavClient = require('../caldav-client')(dependencies);
  const technicalUserHelper = require('../helpers/technical-user')(dependencies);

  return {
    setParticipation
  };

  function setParticipation({ics, eventPath, etag, resource, participation}) {
    const resourceEmail = helpers.getResourceEmail(resource);
    const icalendar = new ICAL.parse(ics);
    const vcalendar = new ICAL.Component(icalendar);
    const updatedEvent = jcalHelper.updateParticipation(vcalendar, resourceEmail, participation);

    return technicalUserHelper.getTechnicalUserToken(resource.domain._id).then(updateEvent);

    function updateEvent(token) {
      return caldavClient.buildEventUrlFromEventPath(eventPath)
        .then(url => caldavClient.updateEvent({ url, etag, ESNToken: token.token, json: updatedEvent.toJSON() }));
    }
  }
};

