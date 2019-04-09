const expect = require('chai').expect;
const request = require('supertest');
const async = require('async');
const fs = require('fs');
const express = require('express');
const { parseString } = require('xml2js');

describe('The Calendar events search API', function() {
  let user;
  const password = 'secret';
  const moduleName = 'linagora.esn.calendar';
  let dav, davServer, caldavConfiguration;

  beforeEach(function(done) {
    const self = this;

    this.helpers.modules.initMidway(moduleName, function(err) {
      if (err) {
        return done(err);
      }

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
          } catch (e) {
            done();
          }
        };

        done();
      });
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
});
