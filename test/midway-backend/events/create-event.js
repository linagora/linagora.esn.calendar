const { expect } = require('chai');
const request = require('supertest');
const ICAL = require('@linagora/ical.js');
const moment = require('moment');

describe('POST /api/events', function() {
  let helpers, models, userId, app, davserver, davHandlers;

  beforeEach(function(done) {
    helpers = this.helpers;
    app = this.app;

    helpers.api.applyDomainDeployment('linagora_test_domain', helpers.callbacks.noErrorAnd(deployedModels => {
      models = deployedModels;
      userId = models.users[0].id;

      helpers.redis.publishConfiguration(err => {
        if (err) {
          return done(err);
        }

        helpers.davserver.saveTestConfiguration(err => {
          if (err) {
            return done(err);
          }

          davserver = helpers.davserver.runConfigurableServer(davHandlers = {});
          done();
        });
      });
    }));
  });

  afterEach(function(done) {
    davserver.close(done);
  });

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
      davHandlers.put = function(req, res) {
        expect(req.path).to.match(new RegExp(`^/calendars/${userId}/${userId}`));

        res.status(201).end();
      };

      request(app)
        .post('/api/events')
        .auth('user1@lng.net', 'secret')
        .set('Accept-Language', 'fr-FR')
        .send(quickEvent('demain à 20h'))
        .expect(200)
        .end(done);
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

  describe('In english', function() {

    it('should return 500 when there is an error creating the event on the DAV server', function(done) {
      davHandlers.put = (req, res) => res.status(503).end();

      request(app)
        .post('/api/events')
        .auth('user1@lng.net', 'secret')
        .set('Accept-Language', 'en-US')
        .send(quickEvent('today at 10'))
        .expect(500, done);
    });

    it('should send a PUT to the DAV server and return 200 when event is created', function(done) {
      davHandlers.put = (req, res) => {
        expect(req.path).to.match(new RegExp(`^/calendars/${userId}/${userId}`));

        res.status(201).end();
      };

      request(app)
        .post('/api/events')
        .auth('user1@lng.net', 'secret')
        .set('Accept-Language', 'en-US')
        .send(quickEvent('today at 10'))
        .expect(200, done);
    });

    it('should support "am"', function(done) {
      davHandlers.put = (req, res) => {
        checkEventSentToDAVServer(req.body, moment().hour(9).minute(30).second(0).millisecond(0));

        res.status(201).end();
      };

      request(app)
        .post('/api/events')
        .auth('user1@lng.net', 'secret')
        .set('Accept-Language', 'en-US')
        .send(quickEvent('today at 9:30 am'))
        .expect(200, done);
    });

    it('should support "pm"', function(done) {
      davHandlers.put = (req, res) => {
        checkEventSentToDAVServer(req.body, moment().hour(21).minute(30).second(0).millisecond(0));

        res.status(201).end();
      };

      request(app)
        .post('/api/events')
        .auth('user1@lng.net', 'secret')
        .set('Accept-Language', 'en-US')
        .send(quickEvent('today at 9:30 pm'))
        .expect(200, done);
    });

    it('should support "today"', function(done) {
      davHandlers.put = (req, res) => {
        checkEventSentToDAVServer(req.body, moment().hour(21).minute(30).second(0).millisecond(0));

        res.status(201).end();
      };

      request(app)
        .post('/api/events')
        .auth('user1@lng.net', 'secret')
        .set('Accept-Language', 'en-US')
        .send(quickEvent('today at 9:30 pm'))
        .expect(200, done);
    });

    it('should support "tonight"', function(done) {
      davHandlers.put = (req, res) => {
        checkEventSentToDAVServer(req.body, moment().hour(21).minute(30).second(0).millisecond(0));

        res.status(201).end();
      };

      request(app)
        .post('/api/events')
        .auth('user1@lng.net', 'secret')
        .set('Accept-Language', 'en-US')
        .send(quickEvent('tonight at 9:30 pm'))
        .expect(200, done);
    });

    it('should support "tomorrow"', function(done) {
      davHandlers.put = (req, res) => {
        checkEventSentToDAVServer(req.body, moment().add(1, 'day').hour(21).minute(30).second(0).millisecond(0));

        res.status(201).end();
      };

      request(app)
        .post('/api/events')
        .auth('user1@lng.net', 'secret')
        .set('Accept-Language', 'en-US')
        .send(quickEvent('tomorrow at 9:30 pm'))
        .expect(200, done);
    });

    it('should support "monday"', function(done) {
      davHandlers.put = (req, res) => {
        checkEventSentToDAVServer(req.body, moment().weekday(1).hour(21).minute(30).second(0).millisecond(0));

        res.status(201).end();
      };

      request(app)
        .post('/api/events')
        .auth('user1@lng.net', 'secret')
        .set('Accept-Language', 'en-US')
        .send(quickEvent('monday at 9:30 pm'))
        .expect(200, done);
    });

    it('should support "tuesday"', function(done) {
      davHandlers.put = (req, res) => {
        checkEventSentToDAVServer(req.body, moment().weekday(2).hour(21).minute(30).second(0).millisecond(0));

        res.status(201).end();
      };

      request(app)
        .post('/api/events')
        .auth('user1@lng.net', 'secret')
        .set('Accept-Language', 'en-US')
        .send(quickEvent('tuesday at 9:30 pm'))
        .expect(200, done);
    });

    it('should support "wednesday"', function(done) {
      davHandlers.put = (req, res) => {
        checkEventSentToDAVServer(req.body, moment().weekday(3).hour(21).minute(30).second(0).millisecond(0));

        res.status(201).end();
      };

      request(app)
        .post('/api/events')
        .auth('user1@lng.net', 'secret')
        .set('Accept-Language', 'en-US')
        .send(quickEvent('wednesday at 9:30 pm'))
        .expect(200, done);
    });

    it('should support "thursday"', function(done) {
      davHandlers.put = (req, res) => {
        checkEventSentToDAVServer(req.body, moment().weekday(4).hour(21).minute(30).second(0).millisecond(0));

        res.status(201).end();
      };

      request(app)
        .post('/api/events')
        .auth('user1@lng.net', 'secret')
        .set('Accept-Language', 'en-US')
        .send(quickEvent('thursday at 9:30 pm'))
        .expect(200, done);
    });

    it('should support "friday"', function(done) {
      davHandlers.put = (req, res) => {
        checkEventSentToDAVServer(req.body, moment().weekday(5).hour(21).minute(30).second(0).millisecond(0));

        res.status(201).end();
      };

      request(app)
        .post('/api/events')
        .auth('user1@lng.net', 'secret')
        .set('Accept-Language', 'en-US')
        .send(quickEvent('friday at 9:30 pm'))
        .expect(200, done);
    });

    it('should support "saturday"', function(done) {
      davHandlers.put = (req, res) => {
        checkEventSentToDAVServer(req.body, moment().weekday(6).hour(21).minute(30).second(0).millisecond(0));

        res.status(201).end();
      };

      request(app)
        .post('/api/events')
        .auth('user1@lng.net', 'secret')
        .set('Accept-Language', 'en-US')
        .send(quickEvent('saturday at 9:30 pm'))
        .expect(200, done);
    });

    it('should support "sunday"', function(done) {
      davHandlers.put = (req, res) => {
        checkEventSentToDAVServer(req.body, moment().weekday(0).hour(21).minute(30).second(0).millisecond(0));

        res.status(201).end();
      };

      request(app)
        .post('/api/events')
        .auth('user1@lng.net', 'secret')
        .set('Accept-Language', 'en-US')
        .send(quickEvent('sunday at 9:30 pm'))
        .expect(200, done);
    });

    it('should support "next ___"', function(done) {
      davHandlers.put = (req, res) => {
        checkEventSentToDAVServer(req.body, moment().weekday(0).add(1, 'week').hour(21).minute(30).second(0).millisecond(0));

        res.status(201).end();
      };

      request(app)
        .post('/api/events')
        .auth('user1@lng.net', 'secret')
        .set('Accept-Language', 'en-US')
        .send(quickEvent('next sunday at 9:30 pm'))
        .expect(200, done);
    });
  });
});
