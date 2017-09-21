'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const ICAL = require('ical.js');
const CONSTANTS = require('../../../../backend/lib/constants');

describe('The calendar search pubsub module', function() {
  let jcal, ics, logger, pubsub, globalpubsub, localpubsub;

  beforeEach(function() {
    logger = {
      error: function() {},
      debug: function() {},
      info: function() {},
      warning: function() {}
    };

    globalpubsub = {};
    localpubsub = {};

    this.moduleHelpers.addDep('logger', logger);
    this.moduleHelpers.addDep('pubsub', pubsub);
    this.moduleHelpers.addDep('pubsub', this.helpers.mock.pubsub('', localpubsub, globalpubsub));

    ics = fs.readFileSync(__dirname + '/../../fixtures/meeting.ics', 'utf-8');
    jcal = new ICAL.Component.fromString(ics).jCal;
    ics = new ICAL.Component.fromString(ics).toString();
  });

  describe('On global pubsub events', function() {
    let self, event, eventSourcePath, eventId, calendarId, userId, path;

    beforeEach(function() {
      self = this;
      eventSourcePath = '/calendars/subscriberId/subscriptionId/eventId.ics';
      eventId = 'eventId';
      calendarId = 'events';
      userId = 'userId';
      path = `/calendar/${userId}/${calendarId}/${eventId}.ics`;
      event = {
        event: jcal,
        eventPath: path
      };
    });

    function testLocalPublishOnEvent(websocketEvent, localTopic, shouldBeCalled) {
      require(self.moduleHelpers.backendPath + '/lib/search/pubsub')(self.moduleHelpers.dependencies).listen();
      const handler = globalpubsub.topics[websocketEvent].handler;

      event.websocketEvent = websocketEvent;
      handler(event);

      if (shouldBeCalled) {
        expect(localpubsub.topics[localTopic].data[0]).to.deep.equals({
          ics,
          path,
          userId,
          calendarId,
          eventUid: 'eventId'
        });
      } else {
        expect(localpubsub.topics[localTopic]).to.be.undefined;
      }

    }

    it('should push event creation on NOTIFICATIONS.EVENT_ADDED', function() {
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.CREATED, CONSTANTS.NOTIFICATIONS.EVENT_ADDED, true);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_ADDED when event has eventSourcePath', function() {
      event.eventSourcePath = eventSourcePath;
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.CREATED, CONSTANTS.NOTIFICATIONS.EVENT_ADDED);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_ADDED when event.eventPath is undefined', function() {
      delete event.eventPath;
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.CREATED, CONSTANTS.NOTIFICATIONS.EVENT_ADDED);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_ADDED when event.eventPath === /', function() {
      event.eventPath = '/';
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.CREATED, CONSTANTS.NOTIFICATIONS.EVENT_ADDED);
    });

    it('should push event creation on NOTIFICATIONS.EVENT_REQUEST', function() {
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.REQUEST, CONSTANTS.NOTIFICATIONS.EVENT_ADDED, true);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_REQUEST when event has eventSourcePath', function() {
      event.eventSourcePath = eventSourcePath;
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.REQUEST, CONSTANTS.NOTIFICATIONS.EVENT_ADDED);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_REQUEST when event.eventPath is undefined', function() {
      delete event.eventPath;
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.REQUEST, CONSTANTS.NOTIFICATIONS.EVENT_ADDED);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_REQUEST when event.eventPath === /', function() {
      event.eventPath = '/';
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.REQUEST, CONSTANTS.NOTIFICATIONS.EVENT_ADDED);
    });

    it('should push event creation on NOTIFICATIONS.EVENT_UPDATED', function() {
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.UPDATED, CONSTANTS.NOTIFICATIONS.EVENT_UPDATED, true);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_UPDATED when event has eventSourcePath', function() {
      event.eventSourcePath = eventSourcePath;
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.UPDATED, CONSTANTS.NOTIFICATIONS.EVENT_UPDATED);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_UPDATED when event.eventPath is undefined', function() {
      delete event.eventPath;
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.UPDATED, CONSTANTS.NOTIFICATIONS.EVENT_UPDATED);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_UPDATED when event.eventPath is undefined === /', function() {
      event.eventPath = '/';
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.UPDATED, CONSTANTS.NOTIFICATIONS.EVENT_UPDATED);
    });

    it('should push event creation on NOTIFICATIONS.EVENT_REPLY', function() {
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.REPLY, CONSTANTS.NOTIFICATIONS.EVENT_UPDATED, true);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_REPLY when event has eventSourcePath', function() {
      event.eventSourcePath = eventSourcePath;
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.REPLY, CONSTANTS.NOTIFICATIONS.EVENT_UPDATED);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_REPLY when event.eventPath is undefined', function() {
      delete event.eventPath;
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.REPLY, CONSTANTS.NOTIFICATIONS.EVENT_UPDATED);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_REPLY when event.eventPath is === /', function() {
      event.eventPath = '/';
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.REPLY, CONSTANTS.NOTIFICATIONS.EVENT_UPDATED);
    });

    it('should push event creation on NOTIFICATIONS.EVENT_DELETED', function() {
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.DELETED, CONSTANTS.NOTIFICATIONS.EVENT_DELETED, true);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_DELETED when event has eventSourcePath', function() {
      event.eventSourcePath = eventSourcePath;
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.DELETED, CONSTANTS.NOTIFICATIONS.EVENT_DELETED);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_DELETED when event.eventPath is undefined', function() {
      delete event.eventPath;
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.DELETED, CONSTANTS.NOTIFICATIONS.EVENT_DELETED);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_DELETED when event.eventPath === /', function() {
      event.eventPath = '/';
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.DELETED, CONSTANTS.NOTIFICATIONS.EVENT_DELETED);
    });

    it('should push event creation on NOTIFICATIONS.EVENT_CANCEL', function() {
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.CANCEL, CONSTANTS.NOTIFICATIONS.EVENT_DELETED, true);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_CANCEL when event has eventSourcePath', function() {
      event.eventSourcePath = eventSourcePath;
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.CANCEL, CONSTANTS.NOTIFICATIONS.EVENT_DELETED);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_CANCEL when event.eventPath is undefined', function() {
      delete event.eventPath;
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.CANCEL, CONSTANTS.NOTIFICATIONS.EVENT_DELETED);
    });

    it('should not push event creation on NOTIFICATIONS.EVENT_CANCEL when event.eventPath === /', function() {
      event.eventPath = '/';
      testLocalPublishOnEvent(CONSTANTS.EVENTS.EVENT.CANCEL, CONSTANTS.NOTIFICATIONS.EVENT_DELETED);
    });
  });
});
