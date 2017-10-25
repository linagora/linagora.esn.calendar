const Q = require('q');
const emailTemplateName = 'resource.request';
const subject = 'An user booked the resource {{name}}';
const EMAIL_REFERER = 'email';

// A resource has been booked from a user ie has been added as attendee in an event
// Send email to all the administrators
module.exports = dependencies => {
  const logger = dependencies('logger');
  const resourceModule = dependencies('resource');
  const emailModule = require('../../email')(dependencies);
  const utils = require('../utils')(dependencies);

  return {
    handle
  };

  function handle({ics, resourceId, eventId, eventPath}) {
    logger.debug('An event in the calendar resource has been created', eventPath);

    return resourceModule.lib.resource.get(resourceId).then(resource => {
      if (!resource) {
        throw new Error(`Resource ${resourceId} has not been found`);
      }

      const headers = {
        'X-OPENPAAS-CAL-ACTION': 'RESOURCE_REQUEST',
        'X-OPENPAAS-CAL-EVENT-PATH': eventPath,
        'X-OPENPAAS-CAL-RESOURCE-ID': resourceId
      };

      return Q.all([
        utils.generateValidationLinks(resourceId, eventId, EMAIL_REFERER),
        resourceModule.lib.administrator.resolve(resource)
      ])
      .spread((links, administrators) => emailModule.sender.send({
        // from: Will be set as resourceEvent.userId/creatorId in https://ci.linagora.com/linagora/lgs/openpaas/linagora.esn.calendar/issues/945
        to: administrators,
        subject: { phrase: subject, parameters: { name: resource.name }},
        ics,
        eventPath,
        emailTemplateName,
        context: { links, resource },
        headers
      }))
      .catch(err => {
        logger.error('Error while sending email to resource administrators', err);
        throw err;
      });
    });
  }
};