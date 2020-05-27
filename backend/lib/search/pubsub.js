const { EVENTS, RECUR_EVENT_MODIFICATION_TYPE } = require('../constants');
const eventHelper = require('../helpers/event');
const jcalHelper = require('../helpers/jcal');
const ICAL = require('@linagora/ical.js');

module.exports = dependencies => {
  const { local: pubsubLocal } = dependencies('pubsub');
  const logger = dependencies('logger');
  const elasticsearchActions = require('./actions')(dependencies);

  return {
    listen
  };

  function listen() {
    pubsubLocal.topic(EVENTS.EVENT.CREATED).subscribe(onCreated);
    pubsubLocal.topic(EVENTS.EVENT.REQUEST).subscribe(onRequest);
    pubsubLocal.topic(EVENTS.EVENT.UPDATED).subscribe(onUpdated);
    pubsubLocal.topic(EVENTS.EVENT.REPLY).subscribe(onReply);
    pubsubLocal.topic(EVENTS.EVENT.DELETED).subscribe(onDeleted);
    pubsubLocal.topic(EVENTS.EVENT.CANCEL).subscribe(onCancel);

    function parse(msg) {
      const parsedMessage = eventHelper.parseEventPath(msg.eventPath);

      try {
        parsedMessage.ics = (new ICAL.Component(msg.event)).toString();
      } catch (error) {
        logger.error(`Problem stringifying component  ${error}`);
      }

      return parsedMessage;
    }

    function _addEventsToIndex(parsedMessage) {
      const vevents = ICAL.Component.fromString(parsedMessage.ics).getAllSubcomponents('vevent');

      vevents.forEach(vevent => {
        if (vevent.getFirstPropertyValue('status') === 'CANCELLED') return;

        const recurrenceId = vevent.getFirstPropertyValue('recurrence-id');

        if (recurrenceId) {
          return elasticsearchActions.addEventToIndexThroughPubsub({ ...parsedMessage, recurrenceId: recurrenceId.toString() });
        }

        elasticsearchActions.addEventToIndexThroughPubsub(parsedMessage);
      });
    }

    function onCreated(msg) {
      if (!canPublishMessage(msg)) return;

      const parsedMessage = parse(msg);

      _addEventsToIndex(parsedMessage);
    }

    function onRequest(msg) {
      if (!canPublishMessage(msg)) return;

      // "REQUEST" messages are sent when the organizer either invites someone to a new event
      // or he updates an already invited event. We can't differentiate these cases, so we are
      // going to remove all the old events and index the new ones here.
      const parsedMessage = parse(msg);
      const vevent = ICAL.Component.fromString(parsedMessage.ics).getFirstSubcomponent('vevent');

      elasticsearchActions.removeEventsFromIndex({
        eventUid: vevent.getFirstPropertyValue('uid'),
        userId: parsedMessage.userId,
        calendarId: parsedMessage.calendarId
      })
        .then(() => _addEventsToIndex(parsedMessage))
        .catch(err => logger.error('Failed to process REQUEST message', err));
    }

    function onUpdated(msg) {
      if (!canPublishMessage(msg)) return;

      const parsedMessage = parse(msg);

      if (!msg.old_event) {
        return elasticsearchActions.updateEventInIndexThroughPubsub(parsedMessage);
      }

      const { actionType, actionDetails } = jcalHelper.analyzeJCalsDiff(msg.old_event, msg.event);

      if (actionType === RECUR_EVENT_MODIFICATION_TYPE.MASTER_EVENT_UPDATE) {
        return elasticsearchActions.updateEventInIndexThroughPubsub(parsedMessage);
      }

      if (actionType === RECUR_EVENT_MODIFICATION_TYPE.FIRST_SPECIAL_OCCURS_ADDED) {
        return elasticsearchActions.addSpecialOccursToIndexIfAnyThroughPubsub(actionDetails.newRecurrenceIds, parsedMessage);
      }

      actionDetails.recurrenceIdsToBeDeleted.forEach(recurrenceId => {
        elasticsearchActions.removeEventFromIndexThroughPubsub({ ...parsedMessage, recurrenceId });
      });

      const vevents = ICAL.Component.fromString(parsedMessage.ics).getAllSubcomponents('vevent');
      vevents.forEach(vevent => {
        const recurrenceId = vevent.getFirstPropertyValue('recurrence-id');

        if (recurrenceId) {
          return elasticsearchActions.updateEventInIndexThroughPubsub({ ...parsedMessage, recurrenceId: recurrenceId.toString() });
        }

        elasticsearchActions.updateEventInIndexThroughPubsub(parsedMessage);
      });
    }

    function onReply(msg) {
      onUpdated(msg);
    }

    function onCancel(msg) {
      if (!canPublishMessage(msg)) return;

      const parsedMessage = parse(msg);
      const vevents = (new ICAL.Component(msg.event)).getAllSubcomponents('vevent');

      vevents.forEach(vevent => {
        // A "CANCEL" message includes the whole calendar object (vcalendar), which might
        // contain vevents that are not actually cancelled, so we need to check this to avoid
        // accidentally deleting those vevents.
        if (vevent.getFirstPropertyValue('status') !== 'CANCELLED') return;

        const recurrenceId = vevent.getFirstPropertyValue('recurrence-id');

        if (recurrenceId) {
          return elasticsearchActions.removeEventFromIndexThroughPubsub({ ...parsedMessage, recurrenceId: recurrenceId.toString() });
        }

        elasticsearchActions.removeEventFromIndexThroughPubsub(parsedMessage);
      });
    }

    function onDeleted(msg) {
      if (!canPublishMessage(msg)) return;

      const parsedMessage = parse(msg);
      const vevents = (new ICAL.Component(msg.event)).getAllSubcomponents('vevent');
      const recurrenceIdsToBeDeleted = jcalHelper.getRecurrenceIdsFromVEvents(vevents);

      recurrenceIdsToBeDeleted.forEach(recurrenceId => {
        elasticsearchActions.removeEventFromIndexThroughPubsub({ ...parsedMessage, recurrenceId });
      });

      elasticsearchActions.removeEventFromIndexThroughPubsub(parsedMessage);
    }

    function canPublishMessage(message) {
      return !message.eventSourcePath && message.eventPath && message.eventPath !== '/';
    }
  }
};
