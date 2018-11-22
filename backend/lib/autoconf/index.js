'use strict';

module.exports = dependencies => {
  const client = require('../caldav-client')(dependencies);
  const URL_PARAMS = 'personal=true&sharedDelegationStatus=accepted&sharedPublicSubscription=true';

  return {
    transform: (config, user) => client.getCalendarList(user.id, URL_PARAMS).then(calendars => {
      config.calendars = calendars.map(calendar => {
        calendar.username = user.preferredEmail;

        return calendar;
      });
    })
  };
};
