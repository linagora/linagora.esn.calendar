const ICAL = require('@linagora/ical.js');
const Q = require('q');
const moment = require('moment-timezone');
const { getNextAlarm } = require('./utils');
const CONSTANTS = require('../constants');
const jcalHelper = require('../helpers/jcal');
let initialized = false;

module.exports = dependencies => {
  const logger = dependencies('logger');
  const { pointToPoint: pointToPointMessaging } = dependencies('messaging');
  const db = require('./db')(dependencies);
  const handlers = require('./handlers')(dependencies);
  const cronjob = require('./cronjob')(dependencies);
  const jobqueue = require('./jobqueue')(dependencies);

  return {
    init,
    processAlarms,
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

    return initListeners();
  }

  function initListeners() {
    pointToPointMessaging.get(CONSTANTS.EVENTS.ALARM.CANCEL).receive(onDelete);
    pointToPointMessaging.get(CONSTANTS.EVENTS.ALARM.CREATED).receive(onCreate);
    pointToPointMessaging.get(CONSTANTS.EVENTS.ALARM.DELETED).receive(onDelete);
    pointToPointMessaging.get(CONSTANTS.EVENTS.ALARM.REQUEST).receive(onUpdate);
    pointToPointMessaging.get(CONSTANTS.EVENTS.ALARM.UPDATED).receive(onUpdate);

    return Q.when(true);
  }

  function onCreate(msg) {
    const eventPath = msg.eventPath;
    const vcalendar = new ICAL.Component(msg.event);
    const vevent = vcalendar.getFirstSubcomponent('vevent');
    const valarms = vevent.getAllSubcomponents('valarm');
    const dtStart = vevent.getFirstPropertyValue('dtstart');

    logger.info(`calendar:alarm:create ${eventPath} - Creating new alarms for event ${eventPath}`);

    if (!valarms || !valarms.length) {
      logger.debug(`calendar:alarm:create ${eventPath} - No alarm defined, skipping`);

      return Promise.resolve([]);
    }

    if (process.env.NODE_ENV !== 'dev' && jcalHelper.getIcalDateAsMoment(dtStart).isBefore(Date.now())) {
      logger.debug(`calendar:alarm:create ${eventPath} - Event is in the past, skipping alarms`);

      return Promise.resolve([]);
    }

    return Q.allSettled(valarms.map(createAlarm));

    function createAlarm(valarm) {
      const alarmObject = jcalHelper.getVAlarmAsObject(valarm, dtStart);

      const alarm = {
        action: valarm.getFirstPropertyValue('action'),
        eventPath,
        eventUid: vevent.getFirstPropertyValue('uid'),
        dueDate: moment.utc(alarmObject.alarmDueDate).toDate(),
        ics: vcalendar.toString()
      };

      if (alarmObject.email) {
        alarm.attendee = alarmObject.email;
      }

      return registerNewAlarm(alarm);
    }
  }

  function onDelete(msg) {
    const {eventPath} = msg;

    logger.info(`calendar:alarm:delete ${eventPath} - Deleting alarms for event ${eventPath}`);

    return db.remove({eventPath});
  }

  function onUpdate(msg) {
    const eventPath = msg.eventPath;

    logger.info(`calendar:alarm:update ${eventPath} - Updating alarms for event ${eventPath}`);

    return db.remove({eventPath, state: CONSTANTS.ALARM.STATE.WAITING})
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
    const valarm = vevent.getFirstSubcomponent('valarm');
    const lastFireDate = previousAlarm.dueDate;

    const nextDueDate = getNextAlarm(vevent, valarm, lastFireDate);

    if (!nextDueDate) {
      logger.debug(`calendar:alarm ${previousAlarm.eventPath} - No next alarm to register`);

      return Promise.resolve({});
    }

    logger.debug(`calendar:alarm ${previousAlarm.eventPath} - Previous alarm: ${moment(previousAlarm.dueDate).utc().format()} / next alarm ${moment(nextDueDate).utc().format()}`);

    const nextAlarm = previousAlarm.toJSON();

    delete nextAlarm._id;
    delete nextAlarm.id;
    delete nextAlarm.state;
    delete nextAlarm.timestamps;
    nextAlarm.dueDate = nextDueDate;

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
      const alarmHandlers = handlers.getHandlersForAction(alarm.action);

      return Q.allSettled(alarmHandlers.map(handler => jobqueue.enqueue(alarm, handler)))
        .then(() => logger.debug(`calendar:alarm ${alarm._id}::${alarm.eventPath} - Submitted jobs in job queue`))
        .then(() => registerNextAlarm(alarm));
    }
  }
};
