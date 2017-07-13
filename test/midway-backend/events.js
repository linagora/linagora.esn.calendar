'use strict';

const fs = require('fs-extra'),
      expect = require('chai').expect,
      request = require('supertest'),
      ICAL = require('ical.js'),
      moment = require('moment'),
      bodyParser = require('body-parser'),
      _ = require('lodash');

const calendarId = 'events';

// random fail
describe.skip('The Calendar events API /api/events', function() {
  let helpers, models, userId, app, davserver, davHandlers, counter = 1;

  beforeEach(function(done) {
    helpers = this.helpers;

    helpers.modules.initMidway('linagora.esn.calendar', helpers.callbacks.noErrorAnd(() => {
      helpers.api.applyDomainDeployment('linagora_test_domain', helpers.callbacks.noErrorAnd(deployedModels => {
        models = deployedModels;
        userId = models.users[0].id;

        helpers.redis.publishConfiguration();
        helpers.elasticsearch.saveTestConfiguration(helpers.callbacks.noErrorAnd(() => {
          helpers.davserver.saveTestConfiguration(() => {
            davserver = helpers.davserver.runConfigurableServer(davHandlers = {});

            done();
          });
        }));
      }));
    }));
  });

  beforeEach(function() {
    require('../../backend/lib/search')(helpers.modules.current.deps).listen();
  });

  beforeEach(function() {
    const deps = helpers.modules.current.deps;
    const expressApp = require('../../backend/webserver/application')(deps);

    expressApp.use(bodyParser.json());
    expressApp.use('/api', helpers.modules.current.lib.api);
    app = helpers.modules.getWebServer(expressApp);
  });

  afterEach(function(done) {
    helpers.api.cleanDomainDeployment(models, () => davserver.close(done));
  });

  function indexEventFromFixture(eventUid, next) {
    const message = {
      eventUid: `event_${counter++}`,
      userId,
      calendarId,
      ics: fs.readFileSync(`${__dirname}/fixtures/${eventUid}.ics`, { encoding: 'utf8' })
    };

    helpers.requireBackend('core/pubsub').local.topic('events:event:add').publish(message);
    helpers.elasticsearch.checkDocumentsIndexed({
      index: 'events.idx',
      type: 'events',
      ids: [message.eventUid],
      check: res => res.status === 200 && _.find(res.body.hits.hits, hit => hit._id === message.eventUid)
    }, helpers.callbacks.noErrorAnd(next));
  }

  describe('GET /api/events/next', function() {

    it('should return 401 if the user is not authenticated', function(done) {
      request(app)
        .get('/api/events/next')
        .expect(401, done);
    });

    it('should return 404 when the user has no next event', function(done) {
      request(app)
        .get('/api/events/next')
        .auth('user1@lng.net', 'secret')
        .expect(404, done);
    });

    it('should return 500 when there is an error searching in the index', function(done) {
      helpers.requireBackend('core/esn-config')('elasticsearch').store({ host: 'fakeEsHost:65535' }, () => {
        request(app)
          .get('/api/events/next')
          .auth('user1@lng.net', 'secret')
          .expect(500, done);
      });
    });

    it('should return 200 with the next event as a JSON object, when JSON is requested', function(done) {
      indexEventFromFixture('SimpleEventIn2117', () => {
        request(app)
          .get('/api/events/next')
          .auth('user1@lng.net', 'secret')
          .set('Accept', 'application/json')
          .expect(200)
          .expect(res => {
            expect(res.body).to.shallowDeepEqual({
              uid: 'SimpleEventIn2117',
              summary: 'SimpleEvent',
              start: '2117-01-01T00:00:00.000Z',
              end: '2117-01-01T02:00:00.000Z',
              calendarId: 'events'
            });
          })
          .end(done);
      });
    });

    it('should return 200 with the next event as a french human readable string, when french text is requested', function(done) {
      indexEventFromFixture('SimpleEventIn2117', () => {
        request(app)
          .get('/api/events/next')
          .auth('user1@lng.net', 'secret')
          .set('Accept-Language', 'fr-FR')
          .set('Accept', 'text/plain')
          .expect(200)
          .expect(res => expect(res.text).to.equal('SimpleEvent, vendredi 1 janvier 2117 01:00'))
          .end(done);
      });
    });

    it('should return 200 with the next event as a english human readable string, when english text is requested', function(done) {
      indexEventFromFixture('SimpleEventIn2117', () => {
        request(app)
          .get('/api/events/next')
          .auth('user1@lng.net', 'secret')
          .set('Accept-Language', 'en')
          .set('Accept', 'text/plain')
          .expect(200)
          .expect(res => expect(res.text).to.equal('SimpleEvent, Friday, January 1, 2117 1:00 AM'))
          .end(done);
      });
    });

    it('should return 200 with the next event as a english human readable string, when text is requested', function(done) {
      indexEventFromFixture('SimpleEventIn2117', () => {
        request(app)
          .get('/api/events/next')
          .auth('user1@lng.net', 'secret')
          .set('Accept', 'text/plain')
          .expect(200)
          .expect(res => expect(res.text).to.equal('SimpleEvent, Friday, January 1, 2117 1:00 AM'))
          .end(done);
      });
    });

  });

  describe('DELETE /api/events/next', function() {

    it('should return 401 if the user is not authenticated', function(done) {
      request(app)
        .delete('/api/events/next')
        .expect(401, done);
    });

    it('should return 404 when the user has no next event', function(done) {
      request(app)
        .delete('/api/events/next')
        .auth('user1@lng.net', 'secret')
        .expect(404, done);
    });

    it('should return 500 when there is an error searching in the index', function(done) {
      helpers.requireBackend('core/esn-config')('elasticsearch').store({ host: 'fakeEsHost:65535' }, () => {
        request(app)
          .delete('/api/events/next')
          .auth('user1@lng.net', 'secret')
          .expect(500, done);
      });
    });

    it('should return 500 when there is an error deleting the event from the DAV server', function(done) {
      davHandlers.delete = (req, res) => res.status(503).end();

      indexEventFromFixture('SimpleEventIn2117', () => {
        request(app)
          .delete('/api/events/next')
          .auth('user1@lng.net', 'secret')
          .expect(500, done);
      });
    });

    it('should send a DELETE to the DAV server and return 200 when there is an event to delete', function(done) {
      davHandlers.delete = (req, res) => {
        expect(req.path).to.equal(`/calendars/${userId}/${calendarId}/SimpleEventIn2117.ics`);

        res.status(200).end();
      };

      indexEventFromFixture('SimpleEventIn2117', () => {
        request(app)
          .delete('/api/events/next')
          .auth('user1@lng.net', 'secret')
          .expect(200, done);
      });
    });

  });

  describe('POST /api/events', function() {

    function quickEvent(when) {
      return {
        when,
        summary: 'Summary',
        location: 'Location'
      };
    }

    function checkEventSentToDAVServer(jcal, expectedStartMoment) {
      const vCalendar = new ICAL.Component(jcal),
            vEvent = vCalendar.getFirstSubcomponent('vevent'),
            event = new ICAL.Event(vEvent);

      expect(event.summary).to.equal('Summary');
      expect(event.location).to.equal('Location');
      expect(event.startDate.toJSDate().getTime()).to.equal(expectedStartMoment.toDate().getTime());
      expect(event.duration.toSeconds()).to.equal(60 * 60);
    }

    it('should return 401 if the user is not authenticated', function(done) {
      request(app)
        .post('/api/events')
        .expect(401, done);
    });

    describe('In french', function() {

      it('should return 500 when there is an error creating the event on the DAV server', function(done) {
        davHandlers.put = (req, res) => res.status(503).end();

        request(app)
          .post('/api/events')
          .auth('user1@lng.net', 'secret')
          .set('Accept-Language', 'fr-FR')
          .send(quickEvent('demain à 20h'))
          .expect(500, done);
      });

      it('should send a PUT to the DAV server and return 200 when event is created', function(done) {
        davHandlers.put = (req, res) => {
          expect(req.path).to.match(new RegExp(`^/calendars/${userId}/${calendarId}`));

          res.status(201).end();
        };

        request(app)
          .post('/api/events')
          .auth('user1@lng.net', 'secret')
          .set('Accept-Language', 'fr-FR')
          .send(quickEvent('demain à 20h'))
          .expect(200, done);
      });

      it('should support "aujourdhui"', function(done) {
        davHandlers.put = (req, res) => {
          checkEventSentToDAVServer(req.body, moment().hour(21).minute(30).second(0).millisecond(0));

          res.status(201).end();
        };

        request(app)
          .post('/api/events')
          .auth('user1@lng.net', 'secret')
          .set('Accept-Language', 'fr-FR')
          .send(quickEvent('aujourdhui à 21h30'))
          .expect(200, done);
      });

      it('should support "ce soir"', function(done) {
        davHandlers.put = (req, res) => {
          checkEventSentToDAVServer(req.body, moment().hour(21).minute(30).second(0).millisecond(0));

          res.status(201).end();
        };

        request(app)
          .post('/api/events')
          .auth('user1@lng.net', 'secret')
          .set('Accept-Language', 'fr-FR')
          .send(quickEvent('ce soir à 21h30'))
          .expect(200, done);
      });

      it('should support "demain"', function(done) {
        davHandlers.put = (req, res) => {
          checkEventSentToDAVServer(req.body, moment().add(1, 'day').hour(21).minute(30).second(0).millisecond(0));

          res.status(201).end();
        };

        request(app)
          .post('/api/events')
          .auth('user1@lng.net', 'secret')
          .set('Accept-Language', 'fr-FR')
          .send(quickEvent('demain à 21h30'))
          .expect(200, done);
      });

      it('should support "lundi"', function(done) {
        davHandlers.put = (req, res) => {
          checkEventSentToDAVServer(req.body, moment().weekday(1).hour(21).minute(30).second(0).millisecond(0));

          res.status(201).end();
        };

        request(app)
          .post('/api/events')
          .auth('user1@lng.net', 'secret')
          .set('Accept-Language', 'fr-FR')
          .send(quickEvent('lundi à 21h30'))
          .expect(200, done);
      });

      it('should support "mardi"', function(done) {
        davHandlers.put = (req, res) => {
          checkEventSentToDAVServer(req.body, moment().weekday(2).hour(21).minute(30).second(0).millisecond(0));

          res.status(201).end();
        };

        request(app)
          .post('/api/events')
          .auth('user1@lng.net', 'secret')
          .set('Accept-Language', 'fr-FR')
          .send(quickEvent('mardi à 21h30'))
          .expect(200, done);
      });

      it('should support "mercredi"', function(done) {
        davHandlers.put = (req, res) => {
          checkEventSentToDAVServer(req.body, moment().weekday(3).hour(21).minute(30).second(0).millisecond(0));

          res.status(201).end();
        };

        request(app)
          .post('/api/events')
          .auth('user1@lng.net', 'secret')
          .set('Accept-Language', 'fr-FR')
          .send(quickEvent('mercredi à 21h30'))
          .expect(200, done);
      });

      it('should support "jeudi"', function(done) {
        davHandlers.put = (req, res) => {
          checkEventSentToDAVServer(req.body, moment().weekday(4).hour(21).minute(30).second(0).millisecond(0));

          res.status(201).end();
        };

        request(app)
          .post('/api/events')
          .auth('user1@lng.net', 'secret')
          .set('Accept-Language', 'fr-FR')
          .send(quickEvent('jeudi à 21h30'))
          .expect(200, done);
      });

      it('should support "vendredi"', function(done) {
        davHandlers.put = (req, res) => {
          checkEventSentToDAVServer(req.body, moment().weekday(5).hour(21).minute(30).second(0).millisecond(0));

          res.status(201).end();
        };

        request(app)
          .post('/api/events')
          .auth('user1@lng.net', 'secret')
          .set('Accept-Language', 'fr-FR')
          .send(quickEvent('vendredi à 21h30'))
          .expect(200, done);
      });

      it('should support "samedi"', function(done) {
        davHandlers.put = (req, res) => {
          checkEventSentToDAVServer(req.body, moment().weekday(6).hour(21).minute(30).second(0).millisecond(0));

          res.status(201).end();
        };

        request(app)
          .post('/api/events')
          .auth('user1@lng.net', 'secret')
          .set('Accept-Language', 'fr-FR')
          .send(quickEvent('samedi à 21h30'))
          .expect(200, done);
      });

      it('should support "dimanche"', function(done) {
        davHandlers.put = (req, res) => {
          checkEventSentToDAVServer(req.body, moment().weekday(7).hour(21).minute(30).second(0).millisecond(0));

          res.status(201).end();
        };

        request(app)
          .post('/api/events')
          .auth('user1@lng.net', 'secret')
          .set('Accept-Language', 'fr-FR')
          .send(quickEvent('dimanche à 21h30'))
          .expect(200, done);
      });

      it('should support "___ prochain"', function(done) {
        davHandlers.put = (req, res) => {
          checkEventSentToDAVServer(req.body, moment().weekday(7).add(1, 'week').hour(21).minute(30).second(0).millisecond(0));

          res.status(201).end();
        };

        request(app)
          .post('/api/events')
          .auth('user1@lng.net', 'secret')
          .set('Accept-Language', 'fr-FR')
          .send(quickEvent('dimanche prochain à 21h30'))
          .expect(200, done);
      });

    });

  });

});
