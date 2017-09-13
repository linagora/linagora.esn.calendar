const extend = require('extend');
const urljoin = require('url-join');
const { ACCEPTED, DECLINED, TENTATIVE } = require('../constants').ATTENDEE.ACTIONS;

module.exports = dependencies => {
  const {jwt} = dependencies('auth');

  return {
    generateActionLink,
    generateActionLinks
  };

  function generateActionLink(baseUrl, jwtPayload, action) {
    const payload = {};

    extend(true, payload, jwtPayload, {action});

    return new Promise((resolve, reject) => {
      jwt.generateWebToken(payload, (err, token) => {
        if (err) {
          return reject(err);
        }

        resolve(urljoin(baseUrl, '/calendar/api/calendars/event/participation/?jwt=' + token));
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
   * @returns {Promise} a promise resolving to an object containing the yes, no and maybe links
   */
  function generateActionLinks(baseUrl, jwtPayload) {
    return Promise.all([
      generateActionLink(baseUrl, jwtPayload, ACCEPTED),
      generateActionLink(baseUrl, jwtPayload, DECLINED),
      generateActionLink(baseUrl, jwtPayload, TENTATIVE)
    ]).then(links => ({
      yes: links[0],
      no: links[1],
      maybe: links[2]
    }));
  }
};
