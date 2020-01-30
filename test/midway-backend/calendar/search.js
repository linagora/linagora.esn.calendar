const expect = require('chai').expect;
const request = require('supertest');
const async = require('async');
const fs = require('fs');

describe('The Calendar events search API', function() {
  let user;
  const password = 'secret';

  beforeEach(function(done) {
    const self = this;

    self.helpers.api.applyDomainDeployment('linagora_IT', function(err, models) {
      if (err) {
        return done(err);
      }
      user = models.users[0];
      self.models = models;

      done();
    });
  });

  beforeEach(function() {
    const expressApp = require('../../../backend/webserver/application')(this.helpers.modules.current.deps);

    expressApp.use('/api', this.helpers.modules.current.lib.api);
    this.app = this.helpers.modules.getWebServer(expressApp);
  });

  afterEach(function(done) {
    const self = this;

    self.helpers.api.cleanDomainDeployment(self.models, () => done());
  });

  describe('/api/calendars/:userId/:calendarId/events.json', function() {
    let localpubsub, message, counter = 1;
    let expectedResult = [];

    const testBasicSearch = function(term, done) {
      const self = this;

      localpubsub.topic('events:event:add').publish(message);

      this.helpers.api.loginAsUser(this.app, user.emails[0], password, function(err, requestAsMember) {
        if (err) {
          return done(err);
        }

        self.helpers.elasticsearch.checkDocumentsIndexed({ index: 'events.idx', type: 'events', ids: [`${message.userId}--${message.eventUid}`] }, function(err) {
          if (err) {
            return done(err);
          }

          const req = requestAsMember(request(self.app).get('/api/calendars/' + message.userId + '/' + message.calendarId + '/events.json'));

          req.query({query: term}).expect(200).end(function(err, res) {
            expect(err).to.not.exist;
            expect(res.body).to.exist;

            const result = res.body._embedded.events.map(item => item._links.self.href);

            expect(result).to.shallowDeepEqual(expectedResult);
            expect(result.length).to.equal(expectedResult.length);
            done();
          });
        });
      });
    };

    beforeEach(function() {
      require('../../../backend/lib/search')(this.helpers.modules.current.deps).listen();
    });

    beforeEach(function(done) {
      localpubsub = this.helpers.requireBackend('core/pubsub').local;
      message = {
        userId: user._id,
        calendarId: 'myCalendar',
        eventUid: 'event_' + counter++
      };
      message.ics = fs.readFileSync(__dirname + '/../fixtures/completeMeeting.ics').toString('utf8');

      setTimeout(() => {
        this.helpers.redis.publishConfiguration();
      }, 200);
      this.helpers.elasticsearch.saveTestConfiguration(this.helpers.callbacks.noError(done));
    });

    it('should return nothing with non matching string', function(done) {
      expectedResult = [];

      testBasicSearch.apply(this, ['anonmatchingstring', done]);
    });

    it('should return nothing with empty string', function(done) {
      expectedResult = [];

      testBasicSearch.apply(this, ['', done]);
    });

    it('should return event with matching summary', function(done) {
      expectedResult = [`/calendars/${message.userId}/${message.calendarId}/${message.eventUid}.ics`];

      testBasicSearch.apply(this, ['withuser012edi', done]);
    });

    it('should return event with matching description', function(done) {
      expectedResult = [`/calendars/${message.userId}/${message.calendarId}/${message.eventUid}.ics`];

      testBasicSearch.apply(this, ['Lunch', done]);
    });

    it('should return event with matching organizer', function(done) {
      expectedResult = [`/calendars/${message.userId}/${message.calendarId}/${message.eventUid}.ics`];

      testBasicSearch.apply(this, ['robert', done]);
    });

    it('should return event with matching attendees', function(done) {
      const self = this;

      const searchFunctions = ['first0', 'last1', 'user2', 'Edinson'].map(function(attendee) {
        return function(callback) {
          expectedResult = [`/calendars/${message.userId}/${message.calendarId}/${message.eventUid}.ics`];

          testBasicSearch.apply(self, [attendee, callback]);
        };
      });

      async.parallel(searchFunctions, done);
    });
  });
});
