const jcalHelper = require('../../../lib/helpers/jcal');
const resourceHelper = require('../../../lib/resource/helpers');

module.exports = dependencies => {
  const logger = dependencies('logger');
  const caldavClient = require('../../../lib/caldav-client')(dependencies);
  const resourceUtils = require('../../../lib/resource/utils')(dependencies);

  return {
    changeParticipation
  };

  function changeParticipation(req, res) {
    const ESNToken = req.token && req.token.token ? req.token.token : '';
    const status = req.query.status;
    const attendeeEmail = resourceHelper.getResourceEmail(req.resource);

    return resourceUtils.getEventUrl(req.params.resourceId, req.params.eventId)
      .then(url => caldavClient.getEventFromUrl({ url, ESNToken })
      .then(event => ({ vcalendar: jcalHelper.icsAsVcalendar(event.ical), etag: event.etag }))
      .then(event => ({ vcalendar: jcalHelper.updateParticipation(event.vcalendar, attendeeEmail, status), etag: event.etag}))
      .then(updatedEvent => caldavClient.updateEvent({ url, etag: updatedEvent.etag, ESNToken, json: updatedEvent.vcalendar.toJSON() }))
      .then(() => res.status(200).send()))
      .catch(err => {
        const details = 'Error while updating event participation';

        logger.error(details, err);
        res.status(500).json({error: { code: 500, message: 'Server Error', details}});
      });
    }
};
