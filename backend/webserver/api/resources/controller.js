const jcalHelper = require('../../../lib/helpers/jcal');
const resourceHelper = require('../../../lib/resource/helpers');
const {
  ATTENDEE: { ACTIONS },
  TRANSP_VALUES
} = require('../../../lib/constants');
const EMAIL_REFERRER = 'email';

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
    const transp = status.toUpperCase() === ACTIONS.ACCEPTED ? TRANSP_VALUES.OPAQUE : TRANSP_VALUES.TRANSPARENT;

    return resourceUtils.getEventUrl(req.params.resourceId, req.params.eventId)
      .then(url => caldavClient.getEventFromUrl({ url, ESNToken })
      .then(event => ({ vcalendar: jcalHelper.icsAsVcalendar(event.ical), etag: event.etag }))
      .then(event => ({ vcalendar: jcalHelper.updateParticipation(event.vcalendar, attendeeEmail, status), etag: event.etag }))
      .then(event => ({ vcalendar: jcalHelper.updateTranspProperty(event.vcalendar, transp), etag: event.etag }))
      .then(updatedEvent => caldavClient.updateEvent({ url, etag: updatedEvent.etag, ESNToken, json: updatedEvent.vcalendar.toJSON() }))
      .then(() => {
        if (req.query.referrer === EMAIL_REFERRER) {
          return res.redirect('/#/calendar');
        }
        res.status(200).send();
      }))
      .catch(err => {
        const details = 'Error while updating event participation';

        logger.error(details, err);
        if (req.query.referrer === EMAIL_REFERRER) {
          return res.redirect('/#/calendar');
        }
        res.status(500).json({error: { code: 500, message: 'Server Error', details}});
      });
    }
};
