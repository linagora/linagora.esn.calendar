var request = require('supertest');

describe('The Calendar calendars API /api/calendars', function() {
  var davserver;

  beforeEach(function(done) {
    var self = this;

    self.helpers.api.applyDomainDeployment('linagora_IT', function(err, models) {
      if (err) {
        return done(err);
      }
      self.models = models;

      self.helpers.davserver.saveTestConfiguration(function() {
        davserver = self.helpers.davserver.runServer('An event !');

        done();
      });
    });
  });

  afterEach(function(done) {
    this.helpers.api.cleanDomainDeployment(this.models, function() {
      davserver.close(done);
    });
  });

  describe('GET /api/calendars/event/participation', function() {
    var jwtCoreModule;

    beforeEach(function(done) {
      jwtCoreModule = this.helpers.requireBackend('core/auth/jwt');

      this.helpers.jwt.saveTestConfiguration(done);
    });

    it('should return 401 if no jwt is provided', function(done) {
      var req = request(this.app).get('/api/calendars/event/participation');

      req.expect(401, done);
    });

    it('should return 400 when the provided jwt does not contain correct information', function(done) {
      var self = this;

      jwtCoreModule.generateWebToken({test: 'notCompliant'}, function(err, token) {
        var req = request(self.app).get('/api/calendars/event/participation?jwt=' + token);

        req.expect(400).end(done);
      });
    });
  });
});
