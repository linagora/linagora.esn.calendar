const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const ICAL = require('@linagora/ical.js');
const mockery = require('mockery');
const CONSTANTS = require('../../../../backend/lib/constants');

describe('The calendar search pubsub module', function() {
  let jcal, ics;
  let logger, pubsub, globalpubsub, localPubsub;
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
    localPubsub = {};

    this.moduleHelpers.addDep('logger', logger);
    this.moduleHelpers.addDep('pubsub', pubsub);
    this.moduleHelpers.addDep('pubsub', this.helpers.mock.pubsub('', localPubsub, globalpubsub));

    ics = fs.readFileSync(__dirname + '/../../fixtures/meeting.ics', 'utf-8');
    jcal = ICAL.Component.fromString(ics).jCal;
    ics = ICAL.Component.fromString(ics).toString();
  });

  describe('On local pubsub events', function() {
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

    function publishLocalEvent(websocketEvent) {
      require(self.moduleHelpers.backendPath + '/lib/search/pubsub')(self.moduleHelpers.dependencies).listen();
      const handler = localPubsub.topics[websocketEvent].handler;

      message.websocketEvent = websocketEvent;
      handler(message);
    }

    describe('On calendar:event:created', function() {
      const localEvent = CONSTANTS.EVENTS.EVENT.CREATED;

      beforeEach(function() {
        elasticsearchActionMock.addEventToIndexThroughPubsub = sinon.stub();
      });

      it('should be able to add a normal event to index', function() {
        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.been.calledOnce;
        expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.been.calledWith(sinon.match(parsedMessage));
      });

      it('should add the master event and its recurrence exceptions to index if it is a recurrent event with recurrence exceptions', function() {
        ics = fs.readFileSync(__dirname + '/../../fixtures/meeting-recurring-with-exception.ics', 'utf-8');
        const vcalendar = ICAL.Component.fromString(ics);
        message.event = vcalendar.jCal;
        parsedMessage.ics = vcalendar.toString();

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.been.calledThrice;
        expect(elasticsearchActionMock.addEventToIndexThroughPubsub.getCall(0).calledWith(sinon.match(parsedMessage))).to.be.true;
        expect(elasticsearchActionMock.addEventToIndexThroughPubsub.getCall(1).calledWith(sinon.match({ ...parsedMessage, recurrenceId: '2016-05-26T17:00:00Z' }))).to.be.true;
        expect(elasticsearchActionMock.addEventToIndexThroughPubsub.getCall(2).calledWith(sinon.match({ ...parsedMessage, recurrenceId: '2016-05-27T17:00:00Z' }))).to.be.true;
      });

      it('should do nothing when event has eventSourcePath', function() {
        message.eventSourcePath = eventSourcePath;

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.not.been.called;
      });

      it('should do nothing when event.eventPath is undefined', function() {
        delete message.eventPath;

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.not.been.called;
      });

      it('should do nothing when event.eventPath === /', function() {
        message.eventPath = '/';

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.not.been.called;
      });
    });

    describe('On calendar:event:request', function() {
      const localEvent = CONSTANTS.EVENTS.EVENT.REQUEST;

      beforeEach(function() {
        elasticsearchActionMock.addEventToIndexThroughPubsub = sinon.stub();
      });

      it('should remove previous event(s) and add a new event to index', function(done) {
        elasticsearchActionMock.removeEventsFromIndex = sinon.stub().returns(Promise.resolve());

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.removeEventsFromIndex).to.have.been.calledOnce;
        expect(elasticsearchActionMock.removeEventsFromIndex).to.have.been.calledWith({
          eventUid: (ICAL.Component.fromString(ics).getFirstSubcomponent('vevent').getFirstPropertyValue('uid')),
          userId: parsedMessage.userId,
          calendarId: parsedMessage.calendarId
        });

        setTimeout(() => {
          expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.been.calledOnce;
          expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.been.calledWith(sinon.match(parsedMessage));
          done();
        });
      });

      it('should remove old events and then add the master event and its recurrence exceptions to index if it is a recurrent event with recurrence exceptions', function(done) {
        elasticsearchActionMock.removeEventsFromIndex = sinon.stub().returns(Promise.resolve());

        ics = fs.readFileSync(__dirname + '/../../fixtures/meeting-recurring-with-exception.ics', 'utf-8');
        const vcalendar = ICAL.Component.fromString(ics);
        message.event = vcalendar.jCal;
        parsedMessage.ics = vcalendar.toString();

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.removeEventsFromIndex).to.have.been.calledOnce;
        expect(elasticsearchActionMock.removeEventsFromIndex).to.have.been.calledWith({
          eventUid: (ICAL.Component.fromString(ics).getFirstSubcomponent('vevent').getFirstPropertyValue('uid')),
          userId: parsedMessage.userId,
          calendarId: parsedMessage.calendarId
        });

        setTimeout(() => {
          expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.been.calledThrice;
          expect(elasticsearchActionMock.addEventToIndexThroughPubsub.getCall(0).calledWith(sinon.match(parsedMessage))).to.be.true;
          expect(elasticsearchActionMock.addEventToIndexThroughPubsub.getCall(1).calledWith(sinon.match({ ...parsedMessage, recurrenceId: '2016-05-26T17:00:00Z' }))).to.be.true;
          expect(elasticsearchActionMock.addEventToIndexThroughPubsub.getCall(2).calledWith(sinon.match({ ...parsedMessage, recurrenceId: '2016-05-27T17:00:00Z' }))).to.be.true;
          done();
        });
      });

      it('should remove old events and only add events which are not cancelled to index', function(done) {
        elasticsearchActionMock.removeEventsFromIndex = sinon.stub().returns(Promise.resolve());

        ics = fs.readFileSync(__dirname + '/../../fixtures/cancelledRecurExceptions.ics', 'utf-8');
        const vcalendar = ICAL.Component.fromString(ics);
        message.event = vcalendar.jCal;
        parsedMessage.ics = vcalendar.toString();

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.removeEventsFromIndex).to.have.been.calledOnce;
        expect(elasticsearchActionMock.removeEventsFromIndex).to.have.been.calledWith({
          eventUid: (ICAL.Component.fromString(ics).getFirstSubcomponent('vevent').getFirstPropertyValue('uid')),
          userId: parsedMessage.userId,
          calendarId: parsedMessage.calendarId
        });

        setTimeout(() => {
          expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.been.once;
          expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.been.calledWith(sinon.match({ ...parsedMessage, recurrenceId: '2020-01-01T04:00:00Z' }));
          done();
        });
      });

      it('should log the error when it failed', function(done) {
        const err = new Error('failed');

        logger.error = sinon.stub();
        elasticsearchActionMock.removeEventsFromIndex = sinon.stub().returns(Promise.reject(err));

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.removeEventsFromIndex).to.have.been.calledOnce;
        expect(elasticsearchActionMock.removeEventsFromIndex).to.have.been.calledWith({
          eventUid: (ICAL.Component.fromString(ics).getFirstSubcomponent('vevent').getFirstPropertyValue('uid')),
          userId: parsedMessage.userId,
          calendarId: parsedMessage.calendarId
        });

        setTimeout(() => {
          expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.not.been.called;
          expect(logger.error).to.have.been.calledOnce;
          expect(logger.error).to.have.been.calledWith('Failed to process REQUEST message', err);
          done();
        });
      });

      it('should do nothing when event has eventSourcePath', function() {
        message.eventSourcePath = eventSourcePath;

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.not.been.called;
      });

      it('should do nothing when event.eventPath is undefined', function() {
        delete message.eventPath;

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.not.been.called;
      });

      it('should do nothing when event.eventPath === /', function() {
        message.eventPath = '/';

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.addEventToIndexThroughPubsub).to.have.not.been.called;
      });
    });

    const onEventUpdatedTests = localEvent => () => {
      const recurrenceIds = ['2016-05-26T17:00:00Z', '2016-05-27T17:00:00Z'];
      const recurrenceIdsToBeDeleted = ['2016-05-28T17:00:00Z'];

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

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.updateEventInIndexThroughPubsub).to.have.been.calledWith(sinon.match(parsedMessage));
      });

      it('should only update master event in index if action type is MASTER_EVENT_UPDATE', function() {
        const actionType = CONSTANTS.RECUR_EVENT_MODIFICATION_TYPE.MASTER_EVENT_UPDATE;

        jcalHelperMock.analyzeJCalsDiff = sinon.stub().returns({ actionType });

        publishLocalEvent(localEvent);

        expect(jcalHelperMock.analyzeJCalsDiff).to.have.been.calledWith(message.old_event, message.event);
        expect(elasticsearchActionMock.updateEventInIndexThroughPubsub).to.have.been.calledWith(sinon.match(parsedMessage));
      });

      it('should only add special occurs to index if action type is FIRST_SPECIAL_OCCURS_ADDED', function() {
        const actionType = CONSTANTS.RECUR_EVENT_MODIFICATION_TYPE.FIRST_SPECIAL_OCCURS_ADDED;
        const actionDetails = { newRecurrenceIds: recurrenceIds };

        jcalHelperMock.analyzeJCalsDiff = sinon.stub().returns({ actionType, actionDetails });

        publishLocalEvent(localEvent);

        expect(jcalHelperMock.analyzeJCalsDiff).to.have.been.calledWith(message.old_event, message.event);
        expect(elasticsearchActionMock.addSpecialOccursToIndexIfAnyThroughPubsub).to.have.been.calledWith(actionDetails.newRecurrenceIds, sinon.match(parsedMessage));
      });

      it('should do a full reindex if action type is FULL_REINDEX', function() {
        const actionType = CONSTANTS.RECUR_EVENT_MODIFICATION_TYPE.FULL_REINDEX;
        const actionDetails = { newRecurrenceIds: recurrenceIds, recurrenceIdsToBeDeleted };

        ics = fs.readFileSync(__dirname + '/../../fixtures/meeting-recurring-with-exception.ics', 'utf-8');
        const vcalendar = ICAL.Component.fromString(ics);
        message.event = vcalendar.jCal;
        parsedMessage.ics = vcalendar.toString();

        jcalHelperMock.analyzeJCalsDiff = sinon.stub().returns({ actionType, actionDetails });

        publishLocalEvent(localEvent);

        expect(jcalHelperMock.analyzeJCalsDiff).to.have.been.calledWith(message.old_event, message.event);

        actionDetails.recurrenceIdsToBeDeleted.forEach((recurrenceId, index) => {
          expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub.getCall(index).calledWith(sinon.match({ ...parsedMessage, recurrenceId }))).to.be.true;
        });
        expect(elasticsearchActionMock.updateEventInIndexThroughPubsub.getCall(0).calledWith(sinon.match(parsedMessage))).to.be.true;
        expect(elasticsearchActionMock.updateEventInIndexThroughPubsub.getCall(1).calledWith(sinon.match({ ...parsedMessage, recurrenceId: '2016-05-26T17:00:00Z' }))).to.be.true;
        expect(elasticsearchActionMock.updateEventInIndexThroughPubsub.getCall(2).calledWith(sinon.match({ ...parsedMessage, recurrenceId: '2016-05-27T17:00:00Z' }))).to.be.true;
      });

      it('should do nothing when event has eventSourcePath', function() {
        message.eventSourcePath = eventSourcePath;

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.not.been.called;
        expect(elasticsearchActionMock.updateEventInIndexThroughPubsub).to.have.not.been.called;
        expect(elasticsearchActionMock.addSpecialOccursToIndexIfAnyThroughPubsub).to.have.not.been.called;
      });

      it('should do nothing when event.eventPath is undefined', function() {
        delete message.eventPath;

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.not.been.called;
        expect(elasticsearchActionMock.updateEventInIndexThroughPubsub).to.have.not.been.called;
        expect(elasticsearchActionMock.addSpecialOccursToIndexIfAnyThroughPubsub).to.have.not.been.called;
      });

      it('should do nothing when event.eventPath === /', function() {
        message.eventPath = '/';

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.not.been.called;
        expect(elasticsearchActionMock.updateEventInIndexThroughPubsub).to.have.not.been.called;
        expect(elasticsearchActionMock.addSpecialOccursToIndexIfAnyThroughPubsub).to.have.not.been.called;
      });
    };

    describe('On calendar:event:updated', onEventUpdatedTests(CONSTANTS.EVENTS.EVENT.UPDATED));

    describe('On calendar:event:reply', onEventUpdatedTests(CONSTANTS.EVENTS.EVENT.REPLY));

    describe('On calendar:event:deleted', function() {
      const localEvent = CONSTANTS.EVENTS.EVENT.DELETED;

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

        publishLocalEvent(localEvent);

        recurrenceIds.forEach((recurrenceId, index) => {
          expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub.getCall(index).calledWith(sinon.match({ ...parsedMessage, recurrenceId }))).to.be.true;
        });

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub.getCall(recurrenceIds.length).calledWith(sinon.match(parsedMessage))).to.be.true;
      });

      it('should just remove the master event if it has no exceptions', function() {
        jcalHelperMock.getRecurrenceIdsFromVEvents = sinon.stub().returns([]);

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.been.calledOnce;
        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.been.calledWith(sinon.match(parsedMessage));
      });

      it('should do nothing when event has eventSourcePath', function() {
        message.eventSourcePath = eventSourcePath;

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.not.been.called;
      });

      it('should do nothing when event.eventPath is undefined', function() {
        delete message.eventPath;

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.not.been.called;
      });

      it('should do nothing when event.eventPath === /', function() {
        message.eventPath = '/';

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.not.been.called;
      });
    });

    describe('On calendar:event:cancel', function() {
      const localEvent = CONSTANTS.EVENTS.EVENT.CANCEL;

      beforeEach(function() {
        elasticsearchActionMock.removeEventFromIndexThroughPubsub = sinon.stub();
      });

      it('should not remove the master event and its special occurs if they are not cancelled', function() {
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

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.not.been.called;
      });

      it('should remove the master event if it is cancelled', function() {
        ics = fs.readFileSync(__dirname + '/../../fixtures/cancelledDailyEvent.ics', 'utf-8');
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

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.been.calledOnce;
        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.been.calledWith(sinon.match(parsedMessage));
      });

      it('should remove only the recurrence exception(s) that are cancelled', function() {
        ics = fs.readFileSync(__dirname + '/../../fixtures/cancelledRecurExceptions.ics', 'utf-8');
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

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.been.calledOnce;
        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.been.calledWith(sinon.match({ ...parsedMessage, recurrenceId: '2020-01-03T04:00:00Z' }));
      });

      it('should do nothing when event has eventSourcePath', function() {
        message.eventSourcePath = eventSourcePath;

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.not.been.called;
      });

      it('should do nothing when event.eventPath is undefined', function() {
        delete message.eventPath;

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.not.been.called;
      });

      it('should do nothing when event.eventPath === /', function() {
        message.eventPath = '/';

        publishLocalEvent(localEvent);

        expect(elasticsearchActionMock.removeEventFromIndexThroughPubsub).to.have.not.been.called;
      });
    });
  });
});
