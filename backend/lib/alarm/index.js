'use strict';

const Q = require('q');
const ICAL = require('ical.js');
const moment = require('moment-timezone');
const CONSTANTS = require('../constants');
const jcalHelper = require('../helpers/jcal');

module.exports = dependencies => {
  const pubsub = dependencies('pubsub');
  const logger = dependencies('logger');
  const Alarm = require('./db/alarm')(dependencies);
  const handlers = require('./handlers')(dependencies);
  const emailHandler = require('./handlers/email')(dependencies);
  const job = require('./job')(dependencies, {
    handlers,
    registerNextAlarm
  });

  handlers.register(emailHandler.action, emailHandler.handle);

  return {
    handlers,
    init,
    registerNewAlarm
  };

  function init() {
    job.start();

    pubsub.local.topic(CONSTANTS.EVENTS.EVENT.CREATED).subscribe(onCreate);
    pubsub.local.topic(CONSTANTS.EVENTS.EVENT.UPDATED).subscribe(onUpdate);
    pubsub.local.topic(CONSTANTS.EVENTS.EVENT.DELETED).subscribe(onDelete);
  }

  function onCreate(msg) {
    const eventPath = msg.eventPath;
    const vcalendar = new ICAL.Component(msg.event);
    const vevent = vcalendar.getFirstSubcomponent('vevent');
    const valarm = vevent.getFirstSubcomponent('valarm');

    logger.info(`calendar:alarm:create ${eventPath} - Creating new alarm for event ${eventPath}`);

    if (!valarm) {
      logger.debug(`calendar:alarm:create ${eventPath} - No alarm defined, skipping`);

      return;
    }

    const alarm = jcalHelper.getVAlarmAsObject(valarm, vevent.getFirstPropertyValue('dtstart'));
    const context = {
      action: valarm.getFirstPropertyValue('action'),
      attendee: alarm.email || alarm.attendee,
      eventPath,
      eventUid: vevent.getFirstPropertyValue('uid'),
      dueDate: moment(alarm.alarmDueDate.format()).toDate(),
      ics: vcalendar.toString()
    };

    // TODO: do not create alarms for past alarms...

    logger.info(`calendar:alarm:create ${eventPath} - Registering new event alarm email ${alarm.email} due at ${alarm.alarmDueDate.clone().local().format()}`);

    return registerNewAlarm(context);
  }

  function onDelete(msg) {
    const eventPath = msg.eventPath;

    logger.info(`calendar:alarm:delete ${eventPath} - Deleting alarms for event ${eventPath}`);

    // TODO: we also need to delete/abort all the jobs which are currently running alarms with this path
    return Alarm.remove({eventPath}).exec();
  }

  function onUpdate(msg) {
    const eventPath = msg.eventPath;
    const vcalendar = new ICAL.Component(msg.old_event);
    const vevent = vcalendar.getFirstSubcomponent('vevent');
    const valarm = vevent.getFirstSubcomponent('valarm');

    logger.info(`calendar:alarm:update ${eventPath} - Updating alarms for event ${eventPath}`);

    const abort = valarm ? () => {
      logger.warning(`calendar:alarm:update ${eventPath} - Aborting old alarms`);
      const alarm = jcalHelper.getVAlarmAsObject(valarm, vevent.getFirstPropertyValue('dtstart'));

      return Alarm.remove({eventPath, attendee: alarm.attendee}).exec();
    } : Q.when({});

    return abort()
      .then(
        () => onCreate(msg),
        err => {
          logger.warning(`calendar:alarm:update ${eventPath} - Error while aborting old alarm, creating new one`, err);

          return onCreate(msg);
        }
      );
  }

  function registerNewAlarm(alarm) {
    logger.debug(`calendar:alarm ${alarm.eventPath} - Register new alarm`, alarm);

    return new Alarm(alarm).save();
  }

  function registerNextAlarm(previousAlarm) {
    logger.debug(`calendar:alarm ${previousAlarm.eventPath} - Register next alarm`);

    const vcalendar = ICAL.Component.fromString(previousAlarm.ics);
    const vevent = vcalendar.getFirstSubcomponent('vevent');

    if (!new ICAL.Event(vevent).isRecurring()) {
      logger.debug(`calendar:alarm ${previousAlarm.eventPath} - Event is not recurring, skipping`);

      return Q.when({});
    }

    const valarm = vevent.getFirstSubcomponent('valarm');
    const trigger = valarm.getFirstPropertyValue('trigger');
    const triggerDuration = moment.duration(trigger);
    let expandStart = moment().add(triggerDuration).format();

    expandStart = new Date(expandStart);
    expandStart = new Date(expandStart.getTime() + 60000);
    expandStart = new ICAL.Time.fromDateTimeString(expandStart.toISOString());

    const expand = new ICAL.RecurExpansion({
      component: vevent,
      dtstart: expandStart
    });
    const nextInstance = expand.next();

    if (!nextInstance) {
      logger.debug(`calendar:alarm ${previousAlarm.eventPath} - Alarm is recurring but does not have next alarm to register`);

      return Q.when({});
    }

    const nextAlarm = previousAlarm.toJSON();

    delete nextAlarm._id;
    delete nextAlarm.id;
    nextAlarm.dueDate = moment(nextInstance.clone()).add(triggerDuration).format();

    return registerNewAlarm(nextAlarm);
  }
};
