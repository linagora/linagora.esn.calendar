const { expect } = require('chai');

describe('The invitation link module', function() {
  describe('The generateActionLinks function', function() {
    let baseUrl, payload;

    beforeEach(function() {
      baseUrl = 'http://localhost:0000';
      payload = {
        attendeeEmail: 'me@openpaas.org',
        uid: '123123'
      };
    });

    it('should fail when the jwt generation fail', function(done) {
      const error = new Error('I failed to get the token');
      let calls = 0;
      const authMock = {
        jwt: {
          generateWebToken: function(p, callback) {
            expect(p).to.shallowDeepEqual(payload);
            expect(p.action).to.exist;
            calls++;
            if (calls === 2) {
              return callback(error);
            }
            callback(null, 'token');
          }
        }
      };

      this.moduleHelpers.addDep('auth', authMock);

      this.module = require(this.moduleHelpers.backendPath + '/lib/invitation/link')(this.moduleHelpers.dependencies);
      this.module.generateActionLinks(baseUrl, payload)
        .then(() => done(new Error('Should not have succeeded')))
        .catch(err => {
          expect(err.message).to.equal(error.message);
          done();
        });
    });

    it('should resolve to an object containing correct links for an internal user', function(done) {
      const linkPrefix = 'http://localhost:0000/calendar/#/calendar/participation/?jwt=123456';
      const linkSuffix = '&eventUid=' + payload.uid;
      const authMock = {
        jwt: {
          generateWebToken: function(p, callback) {
            callback(null, `123456${p.action}`);
          }
        }
      };

      this.moduleHelpers.addDep('auth', authMock);

      this.module = require(this.moduleHelpers.backendPath + '/lib/invitation/link')(this.moduleHelpers.dependencies);
      this.module.generateActionLinks(baseUrl, payload, false)
        .then(links => {
          expect(links).to.deep.equal({
            yes: `${linkPrefix}ACCEPTED${linkSuffix}`,
            no: `${linkPrefix}DECLINED${linkSuffix}`,
            maybe: `${linkPrefix}TENTATIVE${linkSuffix}`
          });
          done();
        })
        .catch(err => done(err || new Error('should resolve')));
    });

    it('should resolve to an object containing correct links for an external user', function(done) {
      const linkPrefix = 'http://localhost:0000/excal/?jwt=123456';
      const linkSuffix = '&eventUid=' + payload.uid;
      const authMock = {
        jwt: {
          generateWebToken: function(p, callback) {
            callback(null, `123456${p.action}`);
          }
        }
      };

      this.moduleHelpers.addDep('auth', authMock);

      this.module = require(this.moduleHelpers.backendPath + '/lib/invitation/link')(this.moduleHelpers.dependencies);
      this.module.generateActionLinks(baseUrl, payload, true)
        .then(links => {
          expect(links).to.deep.equal({
            yes: `${linkPrefix}ACCEPTED${linkSuffix}`,
            no: `${linkPrefix}DECLINED${linkSuffix}`,
            maybe: `${linkPrefix}TENTATIVE${linkSuffix}`
          });
          done();
        })
        .catch(err => done(err || new Error('should resolve')));
    });
  });

  describe('The generateActionLink function', function() {
    let baseUrl, payload;

    beforeEach(function() {
      baseUrl = 'http://localhost:0000';
      payload = {
        attendeeEmail: 'me@openpaas.org',
        uid: '123123'
      };
    });

    it('should fail when the jwt generation fail', function(done) {
      const error = new Error('I failed to get the token');
      const authMock = {
        jwt: {
          generateWebToken: function(p, callback) {
            expect(p).to.shallowDeepEqual(payload);
            expect(p.action).to.exist;

            return callback(error);
          }
        }
      };

      this.moduleHelpers.addDep('auth', authMock);

      this.module = require(this.moduleHelpers.backendPath + '/lib/invitation/link')(this.moduleHelpers.dependencies);
      this.module.generateActionLink(baseUrl, payload, 'ACCEPTED')
        .then(() => done(new Error('should not resolve')))
        .catch(err => {
          expect(err.message).to.equal(error.message);
          done();
        });
    });

    it('should generate the link to the Calendar Public app for an external user', function(done) {
      const authMock = {
        jwt: {
          generateWebToken: function(p, callback) {
            return callback(null, '123456');
          }
        }
      };

      this.moduleHelpers.addDep('auth', authMock);
      this.module = require(this.moduleHelpers.backendPath + '/lib/invitation/link')(this.moduleHelpers.dependencies);

      this.module.generateActionLink(baseUrl, payload, 'ACCEPTED', true)
        .then(actionLink => {
          expect(actionLink).to.deep.equal('http://localhost:0000/excal/?jwt=123456&eventUid=' + payload.uid);
          done();
        })
        .catch(err => done(err || new Error('should resolve')));
    });

    it('should generate the link to the Calendar app for internal users', function(done) {
      const authMock = {
        jwt: {
          generateWebToken: function(p, callback) {
            return callback(null, '123456');
          }
        }
      };

      this.moduleHelpers.addDep('auth', authMock);
      this.module = require(this.moduleHelpers.backendPath + '/lib/invitation/link')(this.moduleHelpers.dependencies);

      this.module.generateActionLink(baseUrl, payload, 'ACCEPTED', false)
        .then(actionLink => {
          expect(actionLink).to.deep.equal('http://localhost:0000/calendar/#/calendar/participation/?jwt=123456&eventUid=' + payload.uid);
          done();
        })
        .catch(err => done(err || new Error('should resolve')));
    });
  });
});
