const { expect } = require('chai');
const mockery = require('mockery');
const sinon = require('sinon');

let jwtDecodeMock;

describe('The calendar middlewares', function() {
  beforeEach(function() {
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
      const userModuleMock = {
        findByEmail: function(email, callback) {
          expect(email).to.equal(req.user.organizerEmail);

          return callback();
        }
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
      const userModuleMock = {
        findByEmail: function(email, callback) {
          expect(email).to.equal(req.user.organizerEmail);

          return callback(new Error());
        }
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
      const userModuleMock = {
        findByEmail: function(email, callback) {
          expect(email).to.equal(req.user.organizerEmail);

          return callback(null, {_id: 'userId'});
        }
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

    it('should call next if all the required properties are present and valid', function(done) {
      const jwt = '123';
      const payload = {
        calendarHomeId: 'calendarHomeId',
        calendarId: 'calendarId',
        userId: 'userId'
      };

      jwtDecodeMock.default.returns(payload);
      const req = { query: { jwt: jwt }, linkPayload: '', user: '' };

      this.loadModule().decodeSecretLinkJWT(req, null, done);
      expect(req.linkPayload).to.equal(payload);
      expect(req.user._id).to.equal(payload.userId);
    });
  });
});
