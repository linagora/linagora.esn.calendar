const { expect } = require('chai');

describe('The calendar middlewares', function() {
  beforeEach(function() {
    this.loadModule = () => require(`${this.moduleHelpers.modulePath}/backend/webserver/api/calendar/middleware`)(this.moduleHelpers.dependencies);
  });

  describe('the decodeJWT middleware', function() {
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

        this.loadModule().decodeJWT(req, res, function() {
          done('Next should not have been called');
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

      this.loadModule().decodeJWT(req, res, function() {
        done('Next should not have been called');
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

      this.loadModule().decodeJWT(req, null, done);
    });

  });

  describe('the checkUserParameter middleware', function() {
    it('should send 403 if request is a query and userId does not match queried userId', function(done) {
      const req = {
        params: {
          userId: 'anotherUserId'
        },
        query: {
          query: 'query'
        },
        user: {
          id: 'userId'
        }
      };
      const res = {
        status: function(status) {
          expect(status).to.equal(403);

          return {
            json: function(error) {
              expect(error).to.exist;
              done();
            }
          };
        }
      };

      this.loadModule().checkUserParameter(req, res, function() {
        done('Next should not have been called');
      });
    });

    it('should call next if request is a query and userId matches queried userId', function(done) {
      const req = {
        params: {
          userId: 'userId'
        },
        query: {
          query: 'query'
        },
        user: {
          id: 'userId'
        }
      };

      this.loadModule().checkUserParameter(req, null, done);
    });

    it('should call next if request is not a query', function(done) {
      const req = {
        query: {},
        user: {
          id: 'userId'
        }
      };

      this.loadModule().checkUserParameter(req, null, done);
    });
  });
});
