const { expect } = require('chai');

describe('The calendar middlewares', function() {
  let userModuleMock;

  beforeEach(function() {
    userModuleMock = {
      get: function(userId, callback) {
        callback(null, { _id: userId });
      }
    };

    this.moduleHelpers.addDep('user', userModuleMock);
    this.loadModule = () => require(`${this.moduleHelpers.modulePath}/backend/webserver/api/calendar/middleware`)(this.moduleHelpers.dependencies);
  });

  describe('the decodeParticipationJWT middleware', function() {
    beforeEach(function() {
      this.check400 = function(req, done) {
        const res = {
          status: function(status) {
            expect(status).to.equal(400);

            return {
              json: function(error) {
                expect(error).to.exist;
                done();
              }
            };
          }
        };

        this.loadModule().decodeParticipationJWT(req, res, function() {
          done(new Error('Next should not have been called'));
        });
      };
    });

    it('should send 400 if req has no calendarURI', function(done) {
      const req = {
        user: {
          event: 'event',
          attendeeEmail: 'attendeeEmail',
          action: 'action',
          organizerEmail: 'organizerEmail'
        }
      };

      this.check400(req, done);
    });

    it('should send 400 if req has no uid', function(done) {
      const req = {
        user: {
          calendarURI: 'calendarURI',
          attendeeEmail: 'attendeeEmail',
          action: 'action',
          organizerEmail: 'organizerEmail'
        }
      };

      this.check400(req, done);
    });

    it('should send 400 if req has no attendeeEmail', function(done) {
      const req = {
        user: {
          calendarURI: 'calendarURI',
          event: 'event',
          action: 'action',
          organizerEmail: 'organizerEmail'
        }
      };

      this.check400(req, done);
    });

    it('should send 400 if req has no action', function(done) {
      const req = {
        user: {
          calendarURI: 'calendarURI',
          event: 'event',
          attendeeEmail: 'attendeeEmail',
          organizerEmail: 'organizerEmail'
        }
      };

      this.check400(req, done);
    });

    it('should send 400 if req has no organizerEmail', function(done) {
      const req = {
        user: {
          calendarURI: 'calendarURI',
          event: 'event',
          attendeeEmail: 'attendeeEmail',
          action: 'action'
        }
      };

      this.check400(req, done);
    });

    it('should send 400 if req.organizerEmail could not be found as a ESN user', function(done) {
      const req = {
        user: {
          calendarURI: 'calendarURI',
          event: 'event',
          attendeeEmail: 'attendeeEmail',
          action: 'action',
          organizerEmail: 'organizerEmail'
        }
      };

      userModuleMock.findByEmail = function(email, callback) {
        expect(email).to.equal(req.user.organizerEmail);

        return callback();
      };

      this.moduleHelpers.addDep('user', userModuleMock);
      this.check400(req, done);
    });

    it('should send 500 if an error happens while searching for req.organizerEmail as a ESN user', function(done) {
      const req = {
        user: {
          calendarURI: 'calendarURI',
          uid: 'uid',
          attendeeEmail: 'attendeeEmail',
          action: 'action',
          organizerEmail: 'organizerEmail'
        }
      };

      userModuleMock.findByEmail = function(email, callback) {
        expect(email).to.equal(req.user.organizerEmail);

        return callback(new Error());
      };

      this.moduleHelpers.addDep('user', userModuleMock);

      const res = {
        status: function(status) {
          expect(status).to.equal(500);

          return {
            json: function(error) {
              expect(error).to.exist;
              done();
            }
          };
        }
      };

      this.loadModule().decodeParticipationJWT(req, res, function() {
        done(new Error('Next should not have been called'));
      });
    });

    it('should call next if all the required properties are present and valid', function(done) {
      const req = {
        user: {
          calendarURI: 'calendarURI',
          uid: 'uid',
          attendeeEmail: 'attendeeEmail',
          action: 'action',
          organizerEmail: 'organizerEmail'
        }
      };

      userModuleMock.findByEmail = function(email, callback) {
        expect(email).to.equal(req.user.organizerEmail);

        return callback(null, {_id: 'userId'});
      };

      this.moduleHelpers.addDep('user', userModuleMock);

      this.loadModule().decodeParticipationJWT(req, null, done);
    });
  });

  describe('the canGetSecretLink middleware', function() {
    it('should allow the request to continue if the user requests to get the secret link of one of his own calendars', function(done) {
      const payload = {
        calendarHomeId: 'calendarHomeId',
        calendarId: 'calendarId'
      };
      const req = { params: payload, user: { _id: payload.calendarHomeId } };

      this.loadModule().canGetSecretLink(req, null, () => {
        done();
      });
    });

    it('should return 403 if the user requests to get the secret link of a calendar that does not belong to him', function(done) {
      const payload = {
        calendarHomeId: 'calendarHomeId',
        calendarId: 'calendarId'
      };
      const req = { params: payload, user: { _id: 'someOtherUser' } };
      const res = {
        status: function(status) {
          expect(status).to.equal(403);

          return {
            json: function(responseBody) {
              expect(responseBody).to.deep.equal({ error: { code: 403, message: 'Forbidden', details: 'Forbidden' } });
              done();
            }
          };
        }
      };

      this.loadModule().canGetSecretLink(req, res, () => {
        throw new Error('next should have not been called');
      });
    });
  });

  describe('the canDownloadIcsFile middleware', function() {
    it('should find the user and allow the request to continue if all the required properties are present and valid', function(done) {
      const token = 'fuf983j19d9d';
      const payload = {
        calendarHomeId: 'calendarHomeId',
        calendarId: 'calendarId'
      };
      const userMock = { _id: payload.calendarHomeId };

      const req = { query: { token }, params: payload };

      userModuleMock.get = function(userId, callback) {
        expect(userId).to.equal(req.params.calendarHomeId);

        callback(null, userMock);
      };

      this.moduleHelpers.addDep('user', userModuleMock);

      this.loadModule().canDownloadIcsFile(req, null, () => {
        expect(req.user).to.deep.equal(userMock);
        done();
      });
    });

    it('should return 403 if the token is missing', function(done) {
      const payload = {
        calendarHomeId: 'calendarHomeId',
        calendarId: 'calendarId'
      };

      const req = { query: {}, params: payload };
      const res = {
        status: function(status) {
          expect(status).to.equal(403);

          return {
            json: function(responseBody) {
              expect(responseBody).to.deep.equal({ error: { code: 403, message: 'Forbidden', details: 'Forbidden' } });
              done();
            }
          };
        }
      };

      this.loadModule().canDownloadIcsFile(req, res, () => {
        throw new Error('next should have not been called');
      });
    });

    it('should return 404 if the user cannot be found', function(done) {
      const token = 'asdflk13f093fi';
      const payload = {
        calendarHomeId: 'calendarHomeId',
        calendarId: 'calendarId'
      };

      const req = { query: { token }, params: payload };
      const res = {
        status: function(status) {
          expect(status).to.equal(404);

          return {
            json: function(responseBody) {
              expect(responseBody).to.deep.equal({ error: { code: 404, message: 'Not Found', details: 'User not found' } });
              done();
            }
          };
        }
      };

      userModuleMock.get = function(userId, callback) {
        expect(userId).to.equal(req.params.calendarHomeId);

        callback(null, null);
      };

      this.moduleHelpers.addDep('user', userModuleMock);

      this.loadModule().canDownloadIcsFile(req, res, () => {
        throw new Error('next should have not been called');
      });
    });

    it('should return 500 if an unexpected error happens when finding the user', function(done) {
      const token = 'sdkg2930sdfsfa';
      const payload = {
        calendarHomeId: 'calendarHomeId',
        calendarId: 'calendarId'
      };

      const req = { query: { token }, params: payload };
      const res = {
        status: function(status) {
          expect(status).to.equal(500);

          return {
            json: function(responseBody) {
              expect(responseBody).to.deep.equal({ error: { code: 500, message: 'Internal Server Error', details: 'Error while searching for user' } });
              done();
            }
          };
        }
      };

      userModuleMock.get = function(userId, callback) {
        expect(userId).to.equal(req.params.calendarHomeId);

        callback(new Error('Something unexpected happened'));
      };

      this.moduleHelpers.addDep('user', userModuleMock);

      this.loadModule().canDownloadIcsFile(req, res, () => {
        throw new Error('next should have not been called');
      });
    });
  });
});
