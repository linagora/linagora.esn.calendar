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

  describe('/api/calendars/events/search', function() {
    const calendarIds = ['user1997calendar1', 'user0publiccalendar1'];
    let localpubsub, message, counter,
        expectedResults = [], mockRequestBody, mockRequestQuery, mockEvents;

    function testAdvancedSearch({ requestBody, requestQuery }, eventElasIds, done) {
      this.helpers.api.loginAsUser(this.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        this.helpers.elasticsearch.checkDocumentsIndexed({ index: 'events.idx', type: 'events', ids: eventElasIds }, err => {
          if (err) {
            return done(err);
          }

          const req = requestAsMember(request(this.app).post(`/api/calendars/events/search?offset=${requestQuery.offset}&limit=${requestQuery.limit}`));

          req.send(requestBody).expect(200).end(function(err, res) {
            expect(err).to.not.exist;
            expect(res.body).to.exist;

            const results = res.body._embedded.events.map(item => item._links.self.href);

            expect(results).to.deep.equal(expectedResults);
            expect(results.length).to.equal(expectedResults.length);
            done();
          });
        });
      });
    }

    function testError400(requestBody, done) {
      this.helpers.api.loginAsUser(this.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        const req = requestAsMember(request(this.app).post('/api/calendars/events/search'));

        req.send(requestBody);
        req.expect(400, done);
      });
    }

    function createMockEvent(userId, calendarId, icsPath) {
      counter++;

      message = {
        userId,
        calendarId,
        eventUid: `advancedSearchEvent_${counter}`,
        ics: fs.readFileSync(__dirname + icsPath).toString('utf8')
      };

      localpubsub.topic('events:event:add').publish(message);

      return {
        eventUid: message.eventUid,
        eventElasId: `${message.userId}--${message.eventUid}`
      };
    }

    beforeEach(function() {
      counter = 0;

      mockRequestBody = {
        calendars: [
          {
            userId: user._id,
            calendarId: user._id
          },
          {
            userId: user._id,
            calendarId: calendarIds[0]
          }
        ],
        query: 'king'
      };

      mockRequestQuery = {
        offset: 0,
        limit: 30
      };

      mockEvents = [
        {
          userId: user._id,
          calendarId: user._id,
          fixturePath: '/../fixtures/eventWithKingInSummary.ics'
        },
        {
          userId: user._id,
          calendarId: calendarIds[0],
          fixturePath: '/../fixtures/eventWithMultipleAttendees.ics'
        },
        {
          userId: 'user0Id',
          calendarId: calendarIds[1],
          fixturePath: '/../fixtures/eventHostedByUser0.ics'
        }
      ];
    });

    beforeEach(function(done) {
      this.helpers.elasticsearch.saveTestConfiguration(this.helpers.callbacks.noError(done));
    });

    it('should send 400 if the query field in the request body is not a string', function(done) {
      expectedResults = [];

      mockRequestBody.query = {};

      testError400.apply(this, [mockRequestBody, done]);
    });

    it('should return an empty array if the request body has an empty query', function(done) {
      expectedResults = [];

      mockRequestBody.query = '';

      testAdvancedSearch.apply(this, [{ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, [], done]);
    });

    it('should return an empty array with a non-matching query string', function(done) {
      localpubsub = this.helpers.requireBackend('core/pubsub').local;

      expectedResults = [];

      mockRequestBody.query = 'anonmatchingstring';

      const { eventElasId } = createMockEvent(mockEvents[0].userId, mockEvents[0].calendarId, mockEvents[0].fixturePath);

      testAdvancedSearch.apply(this, [{ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, [eventElasId], done]);
    });

    it('should send 400 when the calendars field in the request body is not an array', function(done) {
      expectedResults = [];

      mockRequestBody.calendars = 'thisisnotanarray';

      testError400.apply(this, [mockRequestBody, done]);
    });

    it('should return an empty array when an empty calendar array is provided in the request body', function(done) {
      expectedResults = [];

      mockRequestBody.calendars = [];

      testAdvancedSearch.apply(this, [{ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, [], done]);
    });

    it('should return events with multiple matching fields', function(done) {
      localpubsub = this.helpers.requireBackend('core/pubsub').local;

      const mockEventList = [mockEvents[0], mockEvents[1]];
      const eventElasIds = [];

      expectedResults = [];
      mockEventList.forEach(mockEvent => {
        const { eventUid, eventElasId } = createMockEvent(mockEvent.userId, mockEvent.calendarId, mockEvent.fixturePath);

        expectedResults.push(`/calendars/${mockEvent.userId}/${mockEvent.calendarId}/${eventUid}.ics`);
        eventElasIds.push(eventElasId);
      });

      testAdvancedSearch.apply(this, [{ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done]);
    });

    it('should return only one event when limit is set to 1', function(done) {
      localpubsub = this.helpers.requireBackend('core/pubsub').local;

      const mockEventList = [mockEvents[0], mockEvents[1]];
      const eventElasIds = [];

      expectedResults = [];
      mockEventList.forEach(mockEvent => {
        const { eventUid, eventElasId } = createMockEvent(mockEvent.userId, mockEvent.calendarId, mockEvent.fixturePath);

        (!expectedResults.length) && expectedResults.push(`/calendars/${mockEvent.userId}/${mockEvent.calendarId}/${eventUid}.ics`);
        eventElasIds.push(eventElasId);
      });

      mockRequestQuery.limit = 1;

      testAdvancedSearch.apply(this, [{ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done]);
    });

    it('should return only one event when offset is set to the last one', function(done) {
      localpubsub = this.helpers.requireBackend('core/pubsub').local;

      const mockEventList = [mockEvents[0], mockEvents[1]];
      const eventElasIds = [];

      expectedResults = [];
      mockEventList.forEach((mockEvent, index) => {
        const { eventUid, eventElasId } = createMockEvent(mockEvent.userId, mockEvent.calendarId, mockEvent.fixturePath);

        (index === mockEventList.length - 1) && expectedResults.push(`/calendars/${mockEvent.userId}/${mockEvent.calendarId}/${eventUid}.ics`);
        eventElasIds.push(eventElasId);
      });

      mockRequestQuery.offset = 1;
      mockRequestQuery.limit = 30;

      testAdvancedSearch.apply(this, [{ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done]);
    });

    it('should return events when searching across multiple calendars', function(done) {
      localpubsub = this.helpers.requireBackend('core/pubsub').local;

      const eventElasIds = [];

      expectedResults = [];
      mockEvents.forEach(mockEvent => {
        const { eventUid, eventElasId } = createMockEvent(mockEvent.userId, mockEvent.calendarId, mockEvent.fixturePath);

        expectedResults.push(`/calendars/${mockEvent.userId}/${mockEvent.calendarId}/${eventUid}.ics`);
        eventElasIds.push(eventElasId);
      });

      mockRequestBody.calendars = [
        {
          userId: user._id.toString(),
          calendarId: user._id.toString()
        },
        {
          userId: user._id.toString(),
          calendarId: calendarIds[0]
        },
        {
          userId: 'user0Id',
          calendarId: calendarIds[1]
        }
      ];

      testAdvancedSearch.apply(this, [{ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done]);
    });

    it('should return an empty array with a non-matching organizer', function(done) {
      localpubsub = this.helpers.requireBackend('core/pubsub').local;

      expectedResults = [];

      mockRequestBody.organizers = ['non.matching.organizer@mail.com'];

      const { eventElasId } = createMockEvent(mockEvents[0].userId, mockEvents[0].calendarId, mockEvents[0].fixturePath);

      testAdvancedSearch.apply(this, [{ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, [eventElasId], done]);
    });

    it('should return events with one matching organizer when searching across multiple calendars', function(done) {
      localpubsub = this.helpers.requireBackend('core/pubsub').local;

      const eventElasIds = [];

      expectedResults = [];
      mockEvents.forEach((mockEvent, index) => {
        const { eventUid, eventElasId } = createMockEvent(mockEvent.userId, mockEvent.calendarId, mockEvent.fixturePath);

        (index === 2) && expectedResults.push(`/calendars/${mockEvent.userId}/${mockEvent.calendarId}/${eventUid}.ics`);
        eventElasIds.push(eventElasId);
      });

      mockRequestBody.calendars = [
        {
          userId: user._id.toString(),
          calendarId: user._id.toString()
        },
        {
          userId: user._id.toString(),
          calendarId: calendarIds[0]
        },
        {
          userId: 'user0Id',
          calendarId: calendarIds[1]
        }
      ];
      mockRequestBody.organizers = ['user0@open-paas.org'];

      testAdvancedSearch.apply(this, [{ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done]);
    });

    it('should return events with multiple matching organizers when searching across multiple calendars', function(done) {
      localpubsub = this.helpers.requireBackend('core/pubsub').local;

      const eventElasIds = [];

      expectedResults = [];
      mockEvents.forEach(mockEvent => {
        const { eventUid, eventElasId } = createMockEvent(mockEvent.userId, mockEvent.calendarId, mockEvent.fixturePath);

        expectedResults.push(`/calendars/${mockEvent.userId}/${mockEvent.calendarId}/${eventUid}.ics`);
        eventElasIds.push(eventElasId);
      });

      mockRequestBody.calendars = [
        {
          userId: user._id.toString(),
          calendarId: user._id.toString()
        },
        {
          userId: user._id.toString(),
          calendarId: calendarIds[0]
        },
        {
          userId: 'user0Id',
          calendarId: calendarIds[1]
        }
      ];
      mockRequestBody.organizers = ['user1997@open-paas.org', 'user0@open-paas.org'];

      testAdvancedSearch.apply(this, [{ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done]);
    });

    it('should return an empty array with a non-matching attendee', function(done) {
      localpubsub = this.helpers.requireBackend('core/pubsub').local;

      expectedResults = [];

      mockRequestBody.attendees = ['non.matching.attendee@mail.com'];

      const { eventElasId } = createMockEvent(mockEvents[0].userId, mockEvents[0].calendarId, mockEvents[0].fixturePath);

      testAdvancedSearch.apply(this, [{ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, [eventElasId], done]);
    });

    it('should return events with one matching attendee when searching across multiple calendars', function(done) {
      localpubsub = this.helpers.requireBackend('core/pubsub').local;

      const eventElasIds = [];

      expectedResults = [];
      mockEvents.forEach((mockEvent, index) => {
        const { eventUid, eventElasId } = createMockEvent(mockEvent.userId, mockEvent.calendarId, mockEvent.fixturePath);

        (index !== 2) && expectedResults.push(`/calendars/${mockEvent.userId}/${mockEvent.calendarId}/${eventUid}.ics`);
        eventElasIds.push(eventElasId);
      });

      mockRequestBody.calendars = [
        {
          userId: user._id.toString(),
          calendarId: user._id.toString()
        },
        {
          userId: user._id.toString(),
          calendarId: calendarIds[0]
        },
        {
          userId: 'user0Id',
          calendarId: calendarIds[1]
        }
      ];
      mockRequestBody.attendees = ['user1997@open-paas.org'];

      testAdvancedSearch.apply(this, [{ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done]);
    });

    it('should return events with multiple matching attendees when searching across multiple calendars', function(done) {
      localpubsub = this.helpers.requireBackend('core/pubsub').local;

      const eventElasIds = [];

      expectedResults = [];
      mockEvents.forEach(mockEvent => {
        const { eventUid, eventElasId } = createMockEvent(mockEvent.userId, mockEvent.calendarId, mockEvent.fixturePath);

        expectedResults.push(`/calendars/${mockEvent.userId}/${mockEvent.calendarId}/${eventUid}.ics`);
        eventElasIds.push(eventElasId);
      });

      mockRequestBody.calendars = [
        {
          userId: user._id.toString(),
          calendarId: user._id.toString()
        },
        {
          userId: user._id.toString(),
          calendarId: calendarIds[0]
        },
        {
          userId: 'user0Id',
          calendarId: calendarIds[1]
        }
      ];
      mockRequestBody.attendees = ['user3@open-paas.org', 'user0@open-paas.org'];

      testAdvancedSearch.apply(this, [{ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done]);
    });

    it('should return an empty array with a non-matching pair of organizer and attendee when searching across multiple calendars', function(done) {
      localpubsub = this.helpers.requireBackend('core/pubsub').local;

      const eventElasIds = [];

      expectedResults = [];
      mockEvents.forEach((mockEvent, index) => {
        const { eventUid, eventElasId } = createMockEvent(mockEvent.userId, mockEvent.calendarId, mockEvent.fixturePath);

        (index === 5) && expectedResults.push(`/calendars/${mockEvent.userId}/${mockEvent.calendarId}/${eventUid}.ics`);
        eventElasIds.push(eventElasId);
      });

      mockRequestBody.calendars = [
        {
          userId: user._id.toString(),
          calendarId: user._id.toString()
        },
        {
          userId: user._id.toString(),
          calendarId: calendarIds[0]
        },
        {
          userId: 'user0Id',
          calendarId: calendarIds[1]
        }
      ];
      mockRequestBody.organizers = ['user1997@open-paas.org'];
      mockRequestBody.attendees = ['user3@open-paas.org'];

      testAdvancedSearch.apply(this, [{ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done]);
    });

    it('should returns events with matching organizers and attendees when searching across multiple calendars', function(done) {
      localpubsub = this.helpers.requireBackend('core/pubsub').local;

      const eventElasIds = [];

      expectedResults = [];
      mockEvents.forEach((mockEvent, index) => {
        const { eventUid, eventElasId } = createMockEvent(mockEvent.userId, mockEvent.calendarId, mockEvent.fixturePath);

        (index === 0) && expectedResults.push(`/calendars/${mockEvent.userId}/${mockEvent.calendarId}/${eventUid}.ics`);
        eventElasIds.push(eventElasId);
      });

      mockRequestBody.calendars = [
        {
          userId: user._id.toString(),
          calendarId: user._id.toString()
        },
        {
          userId: user._id.toString(),
          calendarId: calendarIds[0]
        },
        {
          userId: 'user0Id',
          calendarId: calendarIds[1]
        }
      ];
      mockRequestBody.organizers = ['user1997@open-paas.org'];
      mockRequestBody.attendees = ['user2@open-paas.org'];

      testAdvancedSearch.apply(this, [{ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done]);
    });
  });
});
