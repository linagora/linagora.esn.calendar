const emailTemplateName = 'resource.accepted';
const subject = 'The reservation of resource {{name}} has been accepted';
const jcalHelper = require('../../helpers/jcal');

// A resource reservation has been validated by an administrator
// Send email to all the event organizer
module.exports = dependencies => {
  const logger = dependencies('logger');
  const resourceModule = dependencies('resource');
  const emailModule = require('../../email')(dependencies);

  return {
    handle
  };

  function handle({ics, resourceId, eventPath}) {
    logger.debug('An event in the calendar resource has been validated', eventPath);

    return resourceModule.lib.resource.get(resourceId).then(resource => {
      if (!resource) {
        throw new Error(`Resource ${resourceId} has not been found`);
      }

      return getEventCreator()
        .then(creator => emailModule.sender.sendWithCustomTemplateFunction({
          to: creator,
          subject: { phrase: subject, parameters: { name: resource.name }},
          ics,
          eventPath,
          emailTemplateName,
          context: { resource }
        }))
        .catch(err => {
          logger.error('Error while sending email to event creator administrators', err);
          throw err;
        });
    });

    function getEventCreator() {
      const event = jcalHelper.jcal2content(ics);

      return event.organizer && event.organizer.email ? Promise.resolve(event.organizer.email) : Promise.reject(new Error('Organizer email can not be found in ICS'));
    }
  }
};
