const expect = require('chai').expect;
const request = require('supertest');
const async = require('async');
const fs = require('fs');
const express = require('express');
const { parseString } = require('xml2js');

describe('The Calendar events search API', function() {
  let user;
  const password = 'secret';
  let dav, davServer, caldavConfiguration;

  beforeEach(function(done) {
    const self = this;

    self.helpers.api.applyDomainDeployment('linagora_IT', function(err, models) {
      if (err) {
        return done(err);
      }
      user = models.users[0];
      self.models = models;

      dav = express();
      dav.use((req, res, next) => {
        let body = '';

        req
        .on('data', chunk => {
          body += chunk;
        })
        .on('end', () => {
          req.body = body;
          next();
        });
      });

      self.createDavServer = function(done) {
        const port = self.testEnv.serversConfig.express.port;

        caldavConfiguration = {
          backend: {
            url: 'http://localhost:' + port
          },
          frontend: {
            url: 'http://localhost:' + port
          }
        };

        davServer = dav.listen(port, function() {
          self.helpers.requireBackend('core/esn-config')('davserver').store(caldavConfiguration, done);
        });
      };

      self.shutdownDav = function(done) {
        if (!davServer) {
          return done();
        }

        try {
          davServer.close(function() {
            done();
          });
        } catch (err) {
          done(err);
        }
      };

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

    self.helpers.api.cleanDomainDeployment(self.models, function() {
      self.shutdownDav(done);
    });
  });

  describe('/api/calendars/:userId/:calendarId/events.json', function() {
    let localpubsub, message, counter = 1;
    let expectedResult = [];

    const search = function(term, done) {
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

            const result = res.body._embedded['dav:item'].map(item => item._links.self.href);

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

    beforeEach(function() {
      dav.report('/calendars', (req, res) => {
        parseString(req.body, (err, result) => {
          if (err) {
            res.status(500).send(err);
          }

          let hrefs = '';

          (result['C:calendar-multiget']['D:href'] || []).forEach(href => {
            hrefs += `<d:href>${href}</d:href>`;
          });

          res.status(207).send(`<?xml version="1.0" encoding="utf-8" ?>
          <d:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
            <d:response>
              ${hrefs}
              <d:propstat>
                <d:prop>
                  <d:getetag></d:getetag>
                  <cal:calendar-data></cal:calendar-data>
                </d:prop>
                <d:status>HTTP/1.1 200 OK</d:status>
              </d:propstat>
            </d:response>
          </d:multistatus>`
          );
        });
     });
    });

    it('should return nothing with non matching string', function(done) {
      expectedResult = [];

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => search.bind(this)('anonmatchingstring', done)));
    });

    it('should return nothing with empty string', function(done) {
      expectedResult = [];

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => search.bind(this)('', done)));
    });

    it('should return event with matching summary', function(done) {
      expectedResult = [`/calendars/${message.userId}/${message.calendarId}/${message.eventUid}.ics`];

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => search.bind(this)('withuser012edi', done)));
    });

    it('should return event with matching description', function(done) {
      expectedResult = [`/calendars/${message.userId}/${message.calendarId}/${message.eventUid}.ics`];

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => search.bind(this)('Lunch', done)));
    });

    it('should return event with matching organizer', function(done) {
      expectedResult = [`/calendars/${message.userId}/${message.calendarId}/${message.eventUid}.ics`];

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => search.bind(this)('robert', done)));
    });

    it('should return event with matching attendees', function(done) {
      const self = this;

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => {
        const searchFunctions = ['first0', 'last1', 'user2', 'Edinson'].map(function(attendee) {
          return function(callback) {
            expectedResult = [`/calendars/${message.userId}/${message.calendarId}/${message.eventUid}.ics`];

            search.bind(self)(attendee, callback);
          };
        });

        async.parallel(searchFunctions, done);
      }));
    });
  });

  describe('/api/calendars/events/search', function() {
    const calendarIds = ['user1997calendar1', 'user0publiccalendar1'];
    let localpubsub, message, counter,
        expectedResults = [], mockRequestBody, mockRequestQuery, mockEvents;

    function searchAdvanced({ requestBody, requestQuery }, eventElasIds, done) {
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

            const results = res.body._embedded['dav:item'].map(item => item._links.self.href);

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

    beforeEach(function() {
      dav.report('/calendars', (req, res) => {
        parseString(req.body, (err, result) => {
          if (err) {
            res.status(500).send(err);
          }

          let davResponses = '';

          (result['C:calendar-multiget']['D:href'] || []).forEach(href => {
            davResponses += `<d:response>
                <d:href>${href}</d:href>
                <d:propstat>
                  <d:prop>
                    <d:getetag></d:getetag>
                    <cal:calendar-data></cal:calendar-data>
                  </d:prop>
                  <d:status>HTTP/1.1 200 OK</d:status>
                </d:propstat>
              </d:response>`;
          });

          res.status(207).send(`<?xml version="1.0" encoding="utf-8" ?>
            <d:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
              ${davResponses}
            </d:multistatus>`
          );
        });
     });
    });

    it('should send 400 if the query field in the request body is not a string', function(done) {
      expectedResults = [];

      mockRequestBody.query = {};

      testError400.bind(this)(mockRequestBody, done);
    });

    it('should return an empty array if the request body has an empty query', function(done) {
      expectedResults = [];

      mockRequestBody.query = '';

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => searchAdvanced.bind(this)({ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, [], done)));
    });

    it('should return an empty array with a non-matching query string', function(done) {
      localpubsub = this.helpers.requireBackend('core/pubsub').local;

      expectedResults = [];

      mockRequestBody.query = 'anonmatchingstring';

      const { eventElasId } = createMockEvent(mockEvents[0].userId, mockEvents[0].calendarId, mockEvents[0].fixturePath);

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => searchAdvanced.bind(this)({ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, [eventElasId], done)));
    });

    it('should send 400 when the calendars field in the request body is not an array', function(done) {
      expectedResults = [];

      mockRequestBody.calendars = 'thisisnotanarray';

      testError400.bind(this)(mockRequestBody, done);
    });

    it('should return an empty array when an empty calendar array is provided in the request body', function(done) {
      expectedResults = [];

      mockRequestBody.calendars = [];

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => searchAdvanced.bind(this)({ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, [], done)));
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

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => searchAdvanced.bind(this)({ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done)));
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

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => searchAdvanced.bind(this)({ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done)));
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

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => searchAdvanced.bind(this)({ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done)));
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

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => searchAdvanced.bind(this)({ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done)));
    });

    it('should return an empty array with a non-matching organizer', function(done) {
      localpubsub = this.helpers.requireBackend('core/pubsub').local;

      expectedResults = [];

      mockRequestBody.organizers = ['non.matching.organizer@mail.com'];

      const { eventElasId } = createMockEvent(mockEvents[0].userId, mockEvents[0].calendarId, mockEvents[0].fixturePath);

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => searchAdvanced.bind(this)({ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, [eventElasId], done)));
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

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => searchAdvanced.bind(this)({ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done)));
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

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => searchAdvanced.bind(this)({ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done)));
    });

    it('should return an empty array with a non-matching attendee', function(done) {
      localpubsub = this.helpers.requireBackend('core/pubsub').local;

      expectedResults = [];

      mockRequestBody.attendees = ['non.matching.attendee@mail.com'];

      const { eventElasId } = createMockEvent(mockEvents[0].userId, mockEvents[0].calendarId, mockEvents[0].fixturePath);

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => searchAdvanced.bind(this)({ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, [eventElasId], done)));
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

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => searchAdvanced.bind(this)({ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done)));
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

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => searchAdvanced.bind(this)({ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done)));
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

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => searchAdvanced.bind(this)({ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done)));
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

      this.createDavServer(this.helpers.callbacks.noErrorAnd(() => searchAdvanced.bind(this)({ requestBody: mockRequestBody, requestQuery: mockRequestQuery }, eventElasIds, done)));
    });
  });
});
