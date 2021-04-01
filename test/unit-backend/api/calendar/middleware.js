const { expect } = require('chai');
const mockery = require('mockery');
const sinon = require('sinon');

let jwtDecodeMock;

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

  describe('the decodeSecretLinkJWT middleware', function() {

    beforeEach(function() {
      jwtDecodeMock = {
        default: sinon.stub()
      };
      mockery.registerMock('jwt-decode', jwtDecodeMock);

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

        this.loadModule().decodeSecretLinkJWT(req, res, function() {
          done(new Error('Next should not have been called'));
        });
      };

    });

    //The token is generated without calendarHomeId
    it('should send 400 if req has no calendarHomeId', function(done) {
      const payload = {
        calendarId: 'calendarId',
        userId: 'userId'
      };

      jwtDecodeMock.default.returns(payload);
      const req = { query: { jwt: 'jwt' } };

      this.check400(req, done);
    });

    //The token is generated without calendarId
    it('should send 400 if req has no calendarId', function(done) {
      const payload = {
        calendarHomeId: 'calendarHomeId',
        userId: 'userId'
      };

      jwtDecodeMock.default.returns(payload);
      const req = { query: { jwt: 'jwt' } };

      this.check400(req, done);
    });

    //The token is generated without userId
    it('should send 400 if req has no userId', function(done) {
      const payload = {
        calendarHomeId: 'calendarHomeId',
        calendarId: 'calendarId'
      };

      jwtDecodeMock.default.returns(payload);
      const req = { query: { jwt: 'jwt' } };

      this.check400(req, done);
    });

    it('should find the user and call next if all the required properties are present and valid', function(done) {
      const jwt = '123';
      const payload = {
        calendarHomeId: 'calendarHomeId',
        calendarId: 'calendarId',
        userId: 'userId'
      };
      const userMock = { _id: payload.userId };

      jwtDecodeMock.default.returns(payload);

      const req = { query: { jwt }, linkPayload: null, user: null };

      userModuleMock.get = function(userId, callback) {
        expect(userId).to.equal(req.linkPayload.userId);

        callback(null, userMock);
      };

      this.moduleHelpers.addDep('user', userModuleMock);

      this.loadModule().decodeSecretLinkJWT(req, null, () => {
        expect(req.user).to.deep.equal(userMock);
        done();
      });

      expect(req.linkPayload).to.equal(payload);
    });

    it('should return 404 if the user cannot be found', function(done) {
      const jwt = '123';
      const payload = {
        calendarHomeId: 'calendarHomeId',
        calendarId: 'calendarId',
        userId: 'userId'
      };

      jwtDecodeMock.default.returns(payload);

      const req = { query: { jwt }, linkPayload: null, user: null };
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
        expect(userId).to.equal(req.linkPayload.userId);

        callback(null, null);
      };

      this.moduleHelpers.addDep('user', userModuleMock);

      this.loadModule().decodeSecretLinkJWT(req, res, () => {
        throw new Error('next should have not been called');
      });

      expect(req.linkPayload).to.equal(payload);
    });

    it('should return 500 if an unexpected error happens when finding the user', function(done) {
      const jwt = '123';
      const payload = {
        calendarHomeId: 'calendarHomeId',
        calendarId: 'calendarId',
        userId: 'userId'
      };

      jwtDecodeMock.default.returns(payload);

      const req = { query: { jwt }, linkPayload: null, user: null };
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
        expect(userId).to.equal(req.linkPayload.userId);

        callback(new Error('Something unexpected happened'));
      };

      this.moduleHelpers.addDep('user', userModuleMock);

      this.loadModule().decodeSecretLinkJWT(req, res, () => {
        throw new Error('next should have not been called');
      });

      expect(req.linkPayload).to.equal(payload);
    });
  });
});
