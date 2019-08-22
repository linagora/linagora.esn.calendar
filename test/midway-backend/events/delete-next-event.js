const fs = require('fs-extra');
const { expect } = require('chai');
const request = require('supertest');

describe('DELETE /api/events/next', function() {
  let helpers, models, userId, app, davserver, davHandlers;
  let counter = 1;

  beforeEach(function(done) {
    helpers = this.helpers;
    app = this.app;
    davHandlers = {};

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

  function indexEventFromFixture(eventUid, next) {
    const message = {
      eventUid: `event_${counter++}`,
      userId,
      calendarId: '123',
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
      expect(req.path).to.equal(`/calendars/${userId}/${userId}/SimpleEventIn2117.ics`);

      res.status(200).end();
    };

    indexEventFromFixture('SimpleEventIn2117', () => {
      request(app)
        .delete('/api/events/next')
        .auth('user1@lng.net', 'secret')
        .expect(200)
        .end(done);
    });
  });
});
