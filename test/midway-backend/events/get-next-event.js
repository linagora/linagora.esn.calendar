const fs = require('fs-extra');
const { expect } = require('chai');
const request = require('supertest');

const calendarId = 'events';

describe('GET /api/events/next', function() {
  let helpers, models, userId, app, counter = 1;

  beforeEach(function(done) {
    helpers = this.helpers;
    app = this.app;

    helpers.api.applyDomainDeployment('linagora_test_domain', helpers.callbacks.noErrorAnd(deployedModels => {
      models = deployedModels;
      userId = models.users[0].id;

      done();
    }));
  });

  function indexEventFromFixture(eventUid, next) {
    const message = {
      eventUid: `event_${counter++}`,
      userId,
      calendarId,
      ics: fs.readFileSync(`${__dirname}/../fixtures/${eventUid}.ics`, { encoding: 'utf8' })
    };

    helpers.requireBackend('core/pubsub').local.topic('events:event:add').publish(message);
    helpers.elasticsearch.checkDocumentsIndexed({
      index: 'events.idx',
      type: 'events',
      ids: [`${userId}--${message.eventUid}`],
      check: res => res.status === 200 && res.body.hits.hits.find(hit => hit._id === `${userId}--${message.eventUid}`)
    }, helpers.callbacks.noErrorAnd(next));
  }

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
        }).end(done);
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
