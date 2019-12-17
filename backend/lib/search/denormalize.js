'use strict';

const jcal = require('../helpers/jcal');
const moment = require('moment');
const _ = require('lodash');
const ICAL = require('@linagora/ical.js');

module.exports = {
  denormalize,
  getId,
  getEventUidFromElasticsearchId
};

function denormalize(data) {
  const timeInfo = jcal.getIcalEvent(data.ics);

  if (data.recurrenceId) return _denormalizeRecurrentEvent(data, timeInfo);

  return _denormalizeNormalEvent(data, timeInfo);
}

function _denormalizeRecurrentEvent(data, timeInfo) {
  const specialOccurVEvent = timeInfo.exceptions[data.recurrenceId].component;
  const specialOccurVCal = ICAL.Component.fromString(data.ics);

  specialOccurVCal.removeAllSubcomponents('vevent');
  specialOccurVCal.addSubcomponent(specialOccurVEvent);

  const specialOccurICS = specialOccurVCal.toString();
  const denormalizedEvent = jcal.jcal2content(specialOccurICS, '');

  denormalizedEvent.recurrenceId = data.recurrenceId;

  _denormalizeCommonProperties(denormalizedEvent, { data, timeInfo: jcal.getIcalEvent(specialOccurICS) });

  return denormalizedEvent;
}

function _denormalizeNormalEvent(data, timeInfo) {
  const denormalizedEvent = jcal.jcal2content(data.ics, '');

  if (timeInfo.component.getFirstPropertyValue('rrule')) denormalizedEvent.isRecurrentMaster = true;

  _denormalizeCommonProperties(denormalizedEvent, { data, timeInfo });

  return denormalizedEvent;
}

function _denormalizeCommonProperties(denormalizedEvent, { data, timeInfo }) {
  const start = moment(timeInfo.startDate.toJSDate());
  const end = moment(timeInfo.endDate.toJSDate());
  const dtStampInIcalObject = timeInfo.component.getFirstPropertyValue('dtstamp');

  denormalizedEvent.userId = data.userId;
  denormalizedEvent.calendarId = data.calendarId;

  if (denormalizedEvent.organizer) {
    delete denormalizedEvent.organizer.avatar;
  }

  delete denormalizedEvent.alarm;
  delete denormalizedEvent.method;
  delete denormalizedEvent.sequence;

  denormalizedEvent.attendees = _.map(denormalizedEvent.attendees, (data, email) => ({ email: email, cn: data.cn }));

  if (denormalizedEvent.resources) {
    denormalizedEvent.resources = _.map(denormalizedEvent.resources, (data, email) => ({ email: email, cn: data.cn }));
  }

  const dtstamp = dtStampInIcalObject ? dtStampInIcalObject.toJSDate() : new Date();

  if (denormalizedEvent.allDay) {
    start.add(start.utcOffset(), 'minutes');
    end.add(end.utcOffset(), 'minutes');
  }
  denormalizedEvent.start = start.toJSON();
  denormalizedEvent.end = end.toJSON();
  denormalizedEvent.dtstamp = moment(dtstamp).toJSON();
}

function getId(event) {
  const { userId, eventUid, recurrenceId } = event;

  if (recurrenceId) return `${userId}--${eventUid}--${recurrenceId}`;

  return `${userId}--${eventUid}`;
}

function getEventUidFromElasticsearchId(elasticsearchId) {
  const eventUid = elasticsearchId.split('--')[1];

  if (eventUid) {
    return eventUid;
  }

  // this is a hack to deal with old ducument indexed in ES with eventUid only
  // once all events in events.idx is reindexed, this hack should be removed
  return elasticsearchId;
}
