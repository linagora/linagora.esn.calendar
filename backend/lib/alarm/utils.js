const ICAL = require('@linagora/ical.js');
const moment = require('moment-timezone');

module.exports = {
  getNextAlarm
};

/**
 * Get the Date of the next alarm to fire.
 *
 * @param {*} vevent
 * @param {*} valarm
 * @param {Date} lastFire: The JS Date last time the alarm was fired. This is not the event dtstart, but event dtstart - trigger
 */
function getNextAlarm(vevent, valarm, lastFire) {
  if (!new ICAL.Event(vevent).isRecurring()) {
    return;
  }

  if (!valarm) {
    return;
  }

  const trigger = valarm.getFirstPropertyValue('trigger');

  if (!trigger) {
    return;
  }

  const triggerDuration = moment.duration(trigger);
  const dtStartJSDate = lastFire ? (moment(lastFire).subtract(triggerDuration).utc().toDate()) : vevent.getFirstPropertyValue('dtstart').toJSDate();

  const expand = new ICAL.RecurExpansion({
    component: vevent,
    dtstart: getDateTimeToStartToLookAt(dtStartJSDate)
  });

  let nextEventInstance = expand.next();

  if (!nextEventInstance) {
    return;
  }

  const nextEventInstanceJSDate = nextEventInstance.toJSDate();

  // for some obscure reason, ICAL.js does return the first occurence which is not the one we want
  // so we check to be really sure that we will not send it back to avoid infinite alarms
  if (nextEventInstanceJSDate.getTime() !== dtStartJSDate.getTime()) {
    return addTrigger(nextEventInstanceJSDate, triggerDuration);
  }

  nextEventInstance = expand.next();
  if (!nextEventInstance) {
    return;
  }

  return addTrigger(nextEventInstance.toJSDate(), triggerDuration);
}

function addTrigger(date, triggerDuration) {
  return moment(date).add(triggerDuration).utc().toDate();
}

function getDateTimeToStartToLookAt(jsDate) {
  const startToLookAt = moment(jsDate).utc().format();

  return new ICAL.Time.fromDateTimeString(startToLookAt);
}
