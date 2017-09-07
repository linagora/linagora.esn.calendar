'use strict';

const ICAL = require('ical.js');
const Q = require('q');
const moment = require('moment-timezone');
const CONSTANTS = require('../constants');
const jcalHelper = require('../helpers/jcal');
let initialized = false;

module.exports = dependencies => {
  const pubsub = dependencies('pubsub');
  const logger = dependencies('logger');
  const db = require('./db')(dependencies);
  const handlers = require('./handlers')(dependencies);
  const cronjob = require('./cronjob')(dependencies);
  const jobqueue = require('./jobqueue')(dependencies);

  return {
    init,
    registerNewAlarm,
    registerNextAlarm,
    registerAlarmHandler
  };

  function init() {
    if (initialized) {
      throw new Error('Already initialized');
    }
    initialized = true;

    registerAlarmHandler(require('./handlers/email')(dependencies));
    cronjob.start(processAlarms);

    pubsub.local.topic(CONSTANTS.EVENTS.EVENT.CREATED).subscribe(onCreate);
    pubsub.local.topic(CONSTANTS.EVENTS.EVENT.UPDATED).subscribe(onUpdate);
    pubsub.local.topic(CONSTANTS.EVENTS.EVENT.DELETED).subscribe(onDelete);
  }

  function onCreate(msg) {
    const eventPath = msg.eventPath;
    const vcalendar = new ICAL.Component(msg.event);
    const vevent = vcalendar.getFirstSubcomponent('vevent');
    // TODO: Handle all alarms, not only the first one!
    const valarm = vevent.getFirstSubcomponent('valarm');

    logger.info(`calendar:alarm:create ${eventPath} - Creating new alarm for event ${eventPath}`);

    if (!valarm) {
      logger.debug(`calendar:alarm:create ${eventPath} - No alarm defined, skipping`);

      return Promise.resolve({});
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

    // TODO: do not create alarms for past alarms, or at least for alarms which are too old...
    logger.info(`calendar:alarm:create ${eventPath} - Registering new event alarm email ${alarm.email} due at ${alarm.alarmDueDate.clone().local().format()}`);

    return registerNewAlarm(context);
  }

  function onDelete(msg) {
    const {eventPath} = msg;

    logger.info(`calendar:alarm:delete ${eventPath} - Deleting alarms for event ${eventPath}`);

    return db.remove({eventPath});
  }

  function onUpdate(msg) {
    const eventPath = msg.eventPath;
    const vcalendar = new ICAL.Component(msg.old_event);
    const vevent = vcalendar.getFirstSubcomponent('vevent');
    // TODO: Handle all alarms, not only the first one!
    const valarm = vevent.getFirstSubcomponent('valarm');

    logger.info(`calendar:alarm:update ${eventPath} - Updating alarms for event ${eventPath}`);

    const abort = valarm ? () => {
      logger.warn(`calendar:alarm:update ${eventPath} - Aborting old alarms`);
      const alarm = jcalHelper.getVAlarmAsObject(valarm, vevent.getFirstPropertyValue('dtstart'));

      return db.remove({eventPath, attendee: alarm.attendee});
    } : () => Promise.resolve({});

    return abort()
      .then(() => onCreate(msg))
      .catch(err => {
        logger.warn(`calendar:alarm:update ${eventPath} - Error while aborting old alarm, creating new one`, err);
        throw err;
      });
  }

  function processAlarms(callback) {
    return db.getAlarmsToHandle()
      .then(submitAlarms)
      .then(result => callback(null, result))
      .catch(callback);
  }

  function registerAlarmHandler(handler) {
    handlers.register(handler);
    jobqueue.createWorker(handler);
  }

  function registerNewAlarm(alarm) {
    logger.debug(`calendar:alarm ${alarm.eventPath} - Register new alarm`, alarm);

    return db.create(alarm);
  }

  function registerNextAlarm(previousAlarm) {
    logger.debug(`calendar:alarm ${previousAlarm.eventPath} - Register next alarm`);

    const vcalendar = ICAL.Component.fromString(previousAlarm.ics);
    const vevent = vcalendar.getFirstSubcomponent('vevent');

    if (!new ICAL.Event(vevent).isRecurring()) {
      logger.debug(`calendar:alarm ${previousAlarm.eventPath} - Event is not recurring, skipping`);

      return Promise.resolve({});
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

      return Promise.resolve({});
    }

    const nextAlarm = previousAlarm.toJSON();

    delete nextAlarm._id;
    delete nextAlarm.id;
    nextAlarm.dueDate = moment(nextInstance.clone()).add(triggerDuration).format();

    return registerNewAlarm(nextAlarm);
  }

  function submitAlarms(alarms) {
    logger.debug(`calendar:alarm - Submitting ${alarms.length} alarm(s)`);

    return Q.allSettled(alarms.map(submitAlarm));
  }

  function submitAlarm(alarm) {
    logger.info(`calendar:alarm ${alarm._id}::${alarm.eventPath} - Submitting alarm`);

    return db.setState(alarm, CONSTANTS.ALARM.STATE.RUNNING)
      .then(submitJobs)
      .then(() => logger.info(`calendar:alarm ${alarm._id}::${alarm.eventPath} - Alarm submitted`))
      .catch(err => {
        logger.error(`calendar:alarm ${alarm._id}::${alarm.eventPath} - Alarm submit error`, err);
        throw err;
      });

    function submitJobs() {
      const alarmHandlers = handlers.get(alarm.action);

      return Q.allSettled(alarmHandlers.map(handler => jobqueue.enqueue(alarm, handler)))
        .then(() => logger.debug(`calendar:alarm ${alarm._id}::${alarm.eventPath} - Submitted jobs in job queue`))
        .then(() => registerNextAlarm(alarm));
    }
  }
};
