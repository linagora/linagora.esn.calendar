const { expect } = require('chai');
const request = require('supertest');
const fs = require('fs');

describe('POST /api/events/search', function() {
  let user, helpers, models;
  const password = 'secret';

  beforeEach(function(done) {
    helpers = this.helpers;

    helpers.api.applyDomainDeployment('linagora_IT', function(err, _models) {
      if (err) {
        return done(err);
      }
      user = _models.users[0];
      models = _models;

      done();
    });
  });

  beforeEach(function() {
    const expressApp = require('../../../backend/webserver/application')(helpers.modules.current.deps);

    expressApp.use('/api', helpers.modules.current.lib.api);
    this.app = helpers.modules.getWebServer(expressApp);
  });

  afterEach(function(done) {
    helpers.api.cleanDomainDeployment(models, () => done());
  });

  const calendarIds = ['user1997calendar1', 'user0publiccalendar1'];
    let localpubsub, message, counter,
        expectedResults = [], mockRequestBody, mockRequestQuery, mockEvents;

    function testAdvancedSearch({ requestBody, requestQuery }, eventElasIds, done) {
      helpers.api.loginAsUser(this.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        helpers.elasticsearch.checkDocumentsIndexed({ index: 'events.idx', type: 'events', ids: eventElasIds }, err => {
          if (err) {
            return done(err);
          }

          const req = requestAsMember(request(this.app).post(`/api/events/search?offset=${requestQuery.offset}&limit=${requestQuery.limit}`));

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
      helpers.api.loginAsUser(this.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        const req = requestAsMember(request(this.app).post('/api/events/search'));

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
      helpers.elasticsearch.saveTestConfiguration(helpers.callbacks.noError(done));
    });

    it('should send 400 if the query sort key is invalid', function(done) {
      helpers.api.loginAsUser(this.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        const req = requestAsMember(request(this.app).post('/api/events/search?sortKey=invalid'));

        req
          .send(mockRequestBody)
          .expect(400)
          .end((err, res) => {
            expect(err).to.not.exist;
            expect(res.body).to.deep.equal({
              error: {
                code: 400,
                message: 'Bad Request',
                details: 'Sort key is invalid. Valid values are: start, end.'
              }
            });
            done();
          });
      });
    });

    it('should send 400 if the query sort key is invalid', function(done) {
      helpers.api.loginAsUser(this.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        const req = requestAsMember(request(this.app).post('/api/events/search?sortKey=start&sortOrder=invalid'));

        req
          .send(mockRequestBody)
          .expect(400)
          .end((err, res) => {
            expect(err).to.not.exist;
            expect(res.body).to.deep.equal({
              error: {
                code: 400,
                message: 'Bad Request',
                details: 'Sort order is invalid. Valid values are: asc, desc.'
              }
            });
            done();
          });
      });
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
      localpubsub = helpers.requireBackend('core/pubsub').local;

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
      localpubsub = helpers.requireBackend('core/pubsub').local;

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
      localpubsub = helpers.requireBackend('core/pubsub').local;

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
      localpubsub = helpers.requireBackend('core/pubsub').local;

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
      localpubsub = helpers.requireBackend('core/pubsub').local;

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
      localpubsub = helpers.requireBackend('core/pubsub').local;

      expectedResults = [];

      mockRequestBody.organizers = ['non.matching.organizer@mail.com'];

      const { eventElasId } = createMockEvent(mockEvents[0].userId, mockEvents[0].calendarId, mockEvents[0].fixturePath);

      testAdvancedSearch.apply(this, [{ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, [eventElasId], done]);
    });

    it('should return events with one matching organizer when searching across multiple calendars', function(done) {
      localpubsub = helpers.requireBackend('core/pubsub').local;

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
      localpubsub = helpers.requireBackend('core/pubsub').local;

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
      localpubsub = helpers.requireBackend('core/pubsub').local;

      expectedResults = [];

      mockRequestBody.attendees = ['non.matching.attendee@mail.com'];

      const { eventElasId } = createMockEvent(mockEvents[0].userId, mockEvents[0].calendarId, mockEvents[0].fixturePath);

      testAdvancedSearch.apply(this, [{ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, [eventElasId], done]);
    });

    it('should return events with one matching attendee when searching across multiple calendars', function(done) {
      localpubsub = helpers.requireBackend('core/pubsub').local;

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
      localpubsub = helpers.requireBackend('core/pubsub').local;

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
      localpubsub = helpers.requireBackend('core/pubsub').local;

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

    it('should return events with matching organizers and attendees when searching across multiple calendars', function(done) {
      localpubsub = helpers.requireBackend('core/pubsub').local;

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

    it('should be able to search for events in calendars with the same calendarId but different userId', function(done) {
      localpubsub = helpers.requireBackend('core/pubsub').local;

      mockEvents = [
        {
          userId: user._id.toString(),
          calendarId: 'events',
          fixturePath: '/../fixtures/eventWithKingInSummary.ics'
        },
        {
          userId: 'user0Id',
          calendarId: 'events',
          fixturePath: '/../fixtures/eventHostedByUser0.ics'
        }
      ];

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
          calendarId: 'events'
        }
      ];

      testAdvancedSearch.bind(this)({ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done);
    });
});
