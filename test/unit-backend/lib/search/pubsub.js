'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const fs = require('fs');
const ICAL = require('@linagora/ical.js');
const mockery = require('mockery');
const CONSTANTS = require('../../../../backend/lib/constants');

describe('The calendar search pubsub module', function() {
  let jcal, ics;
  let logger, pubsub, globalpubsub, localpubsub;
  let elasticsearchActionMock, jcalHelperMock;

  beforeEach(function() {
    logger = {
      error: function() {},
      debug: function() {},
      info: function() {},
      warning: function() {}
    };

    jcalHelperMock = {};
    elasticsearchActionMock = {};

    mockery.registerMock('../helpers/jcal', jcalHelperMock);
    mockery.registerMock('./actions', () => elasticsearchActionMock);

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
    let self, message, eventSourcePath, eventId, calendarId, userId, path, parsedMessage;

    beforeEach(function() {
      self = this;
      eventSourcePath = '/calendars/subscriberId/subscriptionId/eventId.ics';
      eventId = 'eventId';
      calendarId = 'events';
      userId = 'userId';
      path = `/calendar/${userId}/${calendarId}/${eventId}.ics`;
      message = {
        event: jcal,
        eventPath: path
      };
      parsedMessage = {
        ics,
        path,
        userId,
        calendarId,
        eventUid: eventId
      };
    });

    function publishGlobalEvent(websocketEvent) {
      require(self.moduleHelpers.backendPath + '/lib/search/pubsub')(self.moduleHelpers.dependencies).listen();
      const handler = globalpubsub.topics[websocketEvent].handler;

      message.websocketEvent = websocketEvent;
      handler(message);
    }

    const onEventAddedTests = globalEvent => () => {
      var recurrenceIds = [];

      beforeEach(function() {
        elasticsearchActionMock.addEventToIndexThroughPubsub = sinon.stub();
        elasticsearchActionMock.addSpecialOccursToIndexIfAnyThroughPubsub = sinon.stub();
        jcalHelperMock.getRecurrenceIdsFromVEvents = vevents => {
          expect(vevents).to.deep.equal((new ICAL.Component(jcal)).getAllSubcomponents('vevent'));

          return recurrenceIds;
        };
      });

      it('should add master event and its special occurs (if any) to index', function() {
        publishGlobalEvent(globalEvent);

        expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.been.calledWith(sinon.match(parsedMessage));
        expect(elasticsearchActionMock.addSpecialOccursToIndexIfAnyThroughPubsub).to.have.been.calledWith(recurrenceIds, sinon.match(parsedMessage));
      });

      it('should do nothing when event has eventSourcePath', function() {
        message.eventSourcePath = eventSourcePath;

        publishGlobalEvent(globalEvent);

        expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.not.been.called;
        expect(elasticsearchActionMock.addSpecialOccursToIndexIfAnyThroughPubsub).to.have.not.been.called;
      });

      it('should do nothing when event.eventPath is undefined', function() {
        delete message.eventPath;

        publishGlobalEvent(globalEvent);

        expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.not.been.called;
        expect(elasticsearchActionMock.addSpecialOccursToIndexIfAnyThroughPubsub).to.have.not.been.called;
      });

      it('should do nothing when event.eventPath === /', function() {
        message.eventPath = '/';

        publishGlobalEvent(globalEvent);

        expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.not.been.called;
        expect(elasticsearchActionMock.addSpecialOccursToIndexIfAnyThroughPubsub).to.have.not.been.called;
      });
    };

    describe('On NOTIFICATIONS.EVENT_ADDED', onEventAddedTests(CONSTANTS.EVENTS.EVENT.CREATED));

    describe('On NOTIFICATIONS.EVENT_REQUEST', onEventAddedTests(CONSTANTS.EVENTS.EVENT.REQUEST));

    const onEventUpdatedTests = globalEvent => () => {
      const recurrenceIds = ['recurId1', 'recurId2'];
      const recurrenceIdsToBeDeleted = ['recurId2'];

      beforeEach(function() {
        message = {
          old_event: jcal,
          event: jcal,
          eventPath: path
        };

        elasticsearchActionMock.updateEventInIndexThroughPubsub = sinon.stub();
        elasticsearchActionMock.addSpecialOccursToIndexIfAnyThroughPubsub = sinon.stub();
        elasticsearchActionMock.removeEventFromIndexThroughPubsub = sinon.stub();
      });

      it('should only update master event in index when no old event is provided', function() {
        delete message.old_event;

        publishGlobalEvent(globalEvent);

        expect(elasticsearchActionMock.updateEventInIndexThroughPubsub).to.have.been.calledWith(sinon.match(parsedMessage));
      });

      it('should only update master event in index if action type is MASTER_EVENT_UPDATE', function() {
        const actionType = CONSTANTS.RECUR_EVENT_MODIFICATION_TYPE.MASTER_EVENT_UPDATE;

        jcalHelperMock.analyzeJCalsDiff = sinon.stub().returns({ actionType });

        publishGlobalEvent(globalEvent);

        expect(jcalHelperMock.analyzeJCalsDiff).to.have.been.calledWith(message.old_event, message.event);
        expect(elasticsearchActionMock.updateEventInIndexThroughPubsub).to.have.been.calledWith(sinon.match(parsedMessage));
      });

      it('should only add special occurs to index if action type is FIRST_SPECIAL_OCCURS_ADDED', function() {
        const actionType = CONSTANTS.RECUR_EVENT_MODIFICATION_TYPE.FIRST_SPECIAL_OCCURS_ADDED;
        const actionDetails = { newRecurrenceIds: recurrenceIds };

        jcalHelperMock.analyzeJCalsDiff = sinon.stub().returns({ actionType, actionDetails });

        publishGlobalEvent(globalEvent);

        expect(jcalHelperMock.analyzeJCalsDiff).to.have.been.calledWith(message.old_event, message.event);
        expect(elasticsearchActionMock.addSpecialOccursToIndexIfAnyThroughPubsub).to.have.been.calledWith(actionDetails.newRecurrenceIds, sinon.match(parsedMessage));
      });

      it('should do a full reindex if action type is FULL_REINDEX', function() {
        const actionType = CONSTANTS.RECUR_EVENT_MODIFICATION_TYPE.FULL_REINDEX;
        const actionDetails = { newRecurrenceIds: recurrenceIds, recurrenceIdsToBeDeleted };

        jcalHelperMock.analyzeJCalsDiff = sinon.stub().returns({ actionType, actionDetails });

        publishGlobalEvent(globalEvent);

        expect(jcalHelperMock.analyzeJCalsDiff).to.have.been.calledWith(message.old_event, message.event);

        actionDetails.recurrenceIdsToBeDeleted.forEach((recurrenceId, index) => {
          expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub.getCall(index).calledWith(sinon.match({ ...parsedMessage, recurrenceId }))).to.be.true;
        });
        expect(elasticsearchActionMock.updateEventInIndexThroughPubsub).to.have.been.calledWith(sinon.match(parsedMessage));
        expect(elasticsearchActionMock.addSpecialOccursToIndexIfAnyThroughPubsub).to.have.been.calledWith(actionDetails.newRecurrenceIds, sinon.match(parsedMessage));
      });

      it('should do nothing when event has eventSourcePath', function() {
        message.eventSourcePath = eventSourcePath;

        publishGlobalEvent(globalEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.not.been.called;
        expect(elasticsearchActionMock.updateEventInIndexThroughPubsub).to.have.not.been.called;
        expect(elasticsearchActionMock.addSpecialOccursToIndexIfAnyThroughPubsub).to.have.not.been.called;
      });

      it('should do nothing when event.eventPath is undefined', function() {
        delete message.eventPath;

        publishGlobalEvent(globalEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.not.been.called;
        expect(elasticsearchActionMock.updateEventInIndexThroughPubsub).to.have.not.been.called;
        expect(elasticsearchActionMock.addSpecialOccursToIndexIfAnyThroughPubsub).to.have.not.been.called;
      });

      it('should do nothing when event.eventPath === /', function() {
        message.eventPath = '/';

        publishGlobalEvent(globalEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.not.been.called;
        expect(elasticsearchActionMock.updateEventInIndexThroughPubsub).to.have.not.been.called;
        expect(elasticsearchActionMock.addSpecialOccursToIndexIfAnyThroughPubsub).to.have.not.been.called;
      });
    };

    describe('On NOTIFICATIONS.EVENT_UPDATED', onEventUpdatedTests(CONSTANTS.EVENTS.EVENT.UPDATED));

    describe('On NOTIFICATIONS.EVENT_REPLY', onEventUpdatedTests(CONSTANTS.EVENTS.EVENT.REPLY));

    const onEventDeletedTests = globalEvent => () => {
      beforeEach(function() {
        elasticsearchActionMock.removeEventFromIndexThroughPubsub = sinon.stub();
      });

      it('should remove the master event and all its special occurs if it is a recurrent event with exceptions', function() {
        ics = fs.readFileSync(__dirname + '/../../fixtures/meeting-recurring-with-exception.ics', 'utf-8');
        jcal = new ICAL.Component.fromString(ics).jCal;
        ics = new ICAL.Component.fromString(ics).toString();
        message = {
          event: jcal,
          eventPath: path
        };
        parsedMessage = {
          ics,
          path,
          userId,
          calendarId,
          eventUid: eventId
        };

        const recurrenceIds = ['20160526T170000Z', '20160527T170000Z'];
        jcalHelperMock.getRecurrenceIdsFromVEvents = sinon.stub().returns(recurrenceIds);

        publishGlobalEvent(globalEvent);

        recurrenceIds.forEach((recurrenceId, index) => {
          expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub.getCall(index).calledWith(sinon.match({ ...parsedMessage, recurrenceId }))).to.be.true;
        });

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub.getCall(recurrenceIds.length).calledWith(sinon.match(parsedMessage))).to.be.true;
      });

      it('should just remove the master event if it has no exceptions', function() {
        publishGlobalEvent(globalEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.been.calledOnce;
        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.been.calledWith(sinon.match(parsedMessage));
      });

      it('should do nothing when event has eventSourcePath', function() {
        message.eventSourcePath = eventSourcePath;

        publishGlobalEvent(globalEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.not.been.called;
      });

      it('should do nothing when event.eventPath is undefined', function() {
        delete message.eventPath;

        publishGlobalEvent(globalEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.not.been.called;
      });

      it('should do nothing when event.eventPath === /', function() {
        message.eventPath = '/';

        publishGlobalEvent(globalEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.not.been.called;
      });
    };

    describe('On NOTIFICATIONS.EVENT_DELETED', onEventDeletedTests(CONSTANTS.EVENTS.EVENT.DELETED));

    describe('On NOTIFICATIONS.EVENT_CANCEL', onEventDeletedTests(CONSTANTS.EVENTS.EVENT.CANCEL));
  });
});
