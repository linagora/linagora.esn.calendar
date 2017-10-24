const Q = require('q');
const TECHNICAL_USER_TYPE = 'dav';
const TOKEN_TTL = 60;

module.exports = dependencies => {
    const technicalUser = dependencies('technical-user');

    return {
        getTechnicalUserToken
    };

    function getTechnicalUserToken(domainId) {
        return Q.nfcall(technicalUser.findByTypeAndDomain, TECHNICAL_USER_TYPE, domainId)
            .then(technicalUsers => Q.nfcall(technicalUser.getNewToken, technicalUsers[0], TOKEN_TTL));
    }
};
