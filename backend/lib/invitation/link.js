const extend = require('extend');
const _ = require('lodash');
const { ACCEPTED, DECLINED, TENTATIVE } = require('../constants').ATTENDEE.ACTIONS;

module.exports = dependencies => {
  const {jwt} = dependencies('auth');

  return {
    generateActionLink,
    generateActionLinks
  };

  /**
   * Generate action link depending on the type of recipient
   * @param {String} baseUrl the baseUrl of the ESN backend server
   * @param {Object} jwtPayload the payload to be used to generate the JWT for the link
   * @param {String} action
   * @param {Boolean} isExternalRecipient whether or not the recipient is an external user
   * @returns {Promise} a promise resolving to an object containing the yes, no and maybe links
   */
  function generateActionLink(baseUrl, jwtPayload, action, isExternalRecipient) {
    const payload = {};

    extend(true, payload, jwtPayload, {action});

    return new Promise((resolve, reject) => {
      jwt.generateWebToken(payload, (err, token) => {
        if (err) {
          return reject(err);
        }

        const pathUrl = isExternalRecipient ? '/excal' : '/calendar/#/calendar/participation';

        resolve(urlJoin(baseUrl + pathUrl, `?jwt=${token}&eventUid=${jwtPayload.uid}`));
      });
    });
  }

    /**
   * Generates action links for the invitation email.
   * The links will match the following scheme : {baseUrl}/api/calendars/event/participation/?jwt={aToken}
   * where aToken is built from jwtPayload and the action for the link
   *
   * @param {String} baseUrl the baseUrl of the ESN
   * @param {Object} jwtPayload the payload to be used to generate the JWT for the link
   * @param {Boolean} isExternalRecipient whether or not the recipient is an external user
   * @returns {Promise} a promise resolving to an object containing the yes, no and maybe links
   */
  function generateActionLinks(baseUrl, jwtPayload, isExternalRecipient) {
    return Promise.all([
      generateActionLink(baseUrl, jwtPayload, ACCEPTED, isExternalRecipient),
      generateActionLink(baseUrl, jwtPayload, DECLINED, isExternalRecipient),
      generateActionLink(baseUrl, jwtPayload, TENTATIVE, isExternalRecipient)
    ]).then(links => ({
      yes: links[0],
      no: links[1],
      maybe: links[2]
    }));
  }

  function urlJoin(a, b) {
    return _.trimEnd(a, '/') + '/' + _.trimStart(b, '/');
  }
};
