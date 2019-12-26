'use strict';

const { EVENTS, RECUR_EVENT_MODIFICATION_TYPE } = require('../constants');
const eventHelper = require('../helpers/event');
const jcalHelper = require('../helpers/jcal');
const ICAL = require('@linagora/ical.js');

module.exports = dependencies => {
  const pubsub = dependencies('pubsub');
  const logger = dependencies('logger');
  const elasticsearchActions = require('./actions')(dependencies);

  return {
    listen
  };

  function listen() {
    pubsub.global.topic(EVENTS.EVENT.CREATED).subscribe(added);
    pubsub.global.topic(EVENTS.EVENT.REQUEST).subscribe(added);
    pubsub.global.topic(EVENTS.EVENT.UPDATED).subscribe(updated);
    pubsub.global.topic(EVENTS.EVENT.REPLY).subscribe(updated);
    pubsub.global.topic(EVENTS.EVENT.DELETED).subscribe(deleted);
    pubsub.global.topic(EVENTS.EVENT.CANCEL).subscribe(deleted);

    function parse(msg) {
      const parsedMessage = eventHelper.parseEventPath(msg.eventPath);

      try {
        parsedMessage.ics = (new ICAL.Component(msg.event)).toString();
      } catch (error) {
        logger.error(`Problem stringifying component  ${error}`);
      }

      return parsedMessage;
    }

    function added(msg) {
      if (!canPublishMessage(msg)) return;

      const parsedMessage = parse(msg);
      const vevents = ICAL.Component.fromString(parsedMessage.ics).getAllSubcomponents('vevent');

      vevents.forEach(vevent => {
        const recurrenceId = vevent.getFirstPropertyValue('recurrence-id');

        if (recurrenceId) {
          return elasticsearchActions.addEventToIndexThroughPubsub({ ...parsedMessage, recurrenceId: recurrenceId.toString() });
        }

        elasticsearchActions.addEventToIndexThroughPubsub(parsedMessage);
      });
    }

    function updated(msg) {
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
      elasticsearchActions.updateEventInIndexThroughPubsub(parsedMessage);
      elasticsearchActions.addSpecialOccursToIndexIfAnyThroughPubsub(actionDetails.newRecurrenceIds, parsedMessage);
    }

    function deleted(msg) {
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
