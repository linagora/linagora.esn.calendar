'use strict';

const jcal = require('../helpers/jcal');
const moment = require('moment');
const _ = require('lodash');

module.exports = {
  denormalize,
  getId,
  getEventUidFromElasticsearchId
};

function denormalize(data) {
  const event = jcal.jcal2content(data.ics, '');
  const timeInfo = jcal.getIcalEvent(data.ics);
  const start = moment(timeInfo.startDate.toJSDate());
  const end = moment(timeInfo.endDate.toJSDate());
  const dtStampInIcalObject = timeInfo.component.getFirstPropertyValue('dtstamp');
  const dtstamp = dtStampInIcalObject ? dtStampInIcalObject.toJSDate() : new Date();

  if (event.allDay) {
    start.add(start.utcOffset(), 'minutes');
    end.add(end.utcOffset(), 'minutes');
  }
  event.start = start.toJSON();
  event.end = end.toJSON();
  event.dtstamp = moment(dtstamp).toJSON();
  event.userId = data.userId;
  event.calendarId = data.calendarId;

  if (event.organizer) {
    delete event.organizer.avatar;
  }

  delete event.alarm;
  delete event.method;
  delete event.sequence;

  event.attendees = _.map(event.attendees, (data, email) => ({email: email, cn: data.cn}));

  if (event.resources) {
    event.resources = _.map(event.resources, (data, email) => ({ email: email, cn: data.cn }));
  }

  return event;
}

function getId(event) {
  return event.userId + '--' + event.eventUid;
}

function getEventUidFromElasticsearchId(elasticsearchId) {
  // elasticsearchId = event.userId + '--' + event.eventUid;
  const [, eventUid] = elasticsearchId.split('--');

  if (eventUid) {
    return eventUid;
  }

  // this is a hack to deal with old ducument indexed in ES with eventUid only
  // once all events in events.idx is reindexed, this hack should be removed
  return elasticsearchId;
}
