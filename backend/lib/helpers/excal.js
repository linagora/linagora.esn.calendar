'use strict';

const EXCAL_BASE_URL = 'http://excal.open-paas.org.local';
const CALENDAR_BASE_URL = 'http://calendar.open-paas.org.local';

module.exports = {
    getBaseURL
    
};

/**
 * Return the base URL of excal(calendar-public)when it is an external user 
 */

function getBaseURL(isExternalUser) {

  return isExternalUser ? EXCAL_BASE_URL : CALENDAR_BASE_URL;
}
