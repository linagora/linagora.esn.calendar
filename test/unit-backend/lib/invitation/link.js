const {expect} = require('chai');

describe('The invitation link module', function() {
  describe('the generateActionLinks function', function() {
    let baseUrl, payload;

    beforeEach(function() {
      baseUrl = 'http://localhost:0000';
      payload = {
        attendeeEmail: 'me@openpaas.org'
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

    it('should resolve to an object containing correct links', function(done) {
      const linkBase = baseUrl + '/calendar/api/calendars/event/participation?jwt=token';
      const authMock = {
        jwt: {
          generateWebToken: function(p, callback) {
            expect(p).to.shallowDeepEqual(payload);
            expect(p.action).to.exist;
            callback(null, 'token' + p.action);
          }
        }
      };

      this.moduleHelpers.addDep('auth', authMock);

      this.module = require(this.moduleHelpers.backendPath + '/lib/invitation/link')(this.moduleHelpers.dependencies);
      this.module.generateActionLinks(baseUrl, payload).then(links => {
        expect(links).to.deep.equal({
          yes: `${linkBase}ACCEPTED`,
          no: `${linkBase}DECLINED`,
          maybe: `${linkBase}TENTATIVE`
        });
        done();
      }, done);
    });
  });

});
