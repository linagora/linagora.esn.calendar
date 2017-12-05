'use strict';

const ICAL = require('@linagora/ical.js');
const Q = require('q');
const moment = require('moment-timezone');
const CONSTANTS = require('../constants');
const jcalHelper = require('../helpers/jcal');
let initialized = false;

module.exports = dependencies => {
  const amqpClientProvider = dependencies('amqpClientProvider');
  const logger = dependencies('logger');
  const db = require('./db')(dependencies);
  const handlers = require('./handlers')(dependencies);
  const cronjob = require('./cronjob')(dependencies);
  const jobqueue = require('./jobqueue')(dependencies);
  let amqpClient;

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

    return initAMQPListeners();
  }

  function initAMQPListeners() {
    const amqpClientPromise = amqpClientProvider.getClient();

    return amqpClientPromise
      .then(client => {
        amqpClient = client;

        amqpClient.subscribe(CONSTANTS.EVENTS.ALARM.CANCEL, messageHandler(onDelete));
        amqpClient.subscribe(CONSTANTS.EVENTS.ALARM.CREATED, messageHandler(onCreate));
        amqpClient.subscribe(CONSTANTS.EVENTS.ALARM.DELETED, messageHandler(onDelete));
        amqpClient.subscribe(CONSTANTS.EVENTS.ALARM.REQUEST, messageHandler(onUpdate));
        amqpClient.subscribe(CONSTANTS.EVENTS.ALARM.UPDATED, messageHandler(onUpdate));
    });

    function messageHandler(handler) {
      return function(jsonMessage, originalMessage) {
        return handler(jsonMessage)
          .then(() => amqpClient.ack(originalMessage))
          .catch(err => {
            logger.error('calendar:alarm:init - Fail to process AMQP message', err);
            throw err;
          });
      };
    }
  }

  function onCreate(msg) {
    const eventPath = msg.eventPath;
    const vcalendar = new ICAL.Component(msg.event);
    const vevent = vcalendar.getFirstSubcomponent('vevent');
    const valarms = vevent.getAllSubcomponents('valarm');

    logger.info(`calendar:alarm:create ${eventPath} - Creating new alarms for event ${eventPath}`);

    if (!valarms || !valarms.length) {
      logger.debug(`calendar:alarm:create ${eventPath} - No alarm defined, skipping`);

      return Promise.resolve([]);
    }

    return Q.allSettled(valarms.map(createAlarm));

    function createAlarm(valarm) {
      const alarmObject = jcalHelper.getVAlarmAsObject(valarm, vevent.getFirstPropertyValue('dtstart'));
      const alarm = {
        action: valarm.getFirstPropertyValue('action'),
        eventPath,
        eventUid: vevent.getFirstPropertyValue('uid'),
        dueDate: moment(alarmObject.alarmDueDate.format()).toDate(),
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

    if (!new ICAL.Event(vevent).isRecurring()) {
      logger.debug(`calendar:alarm ${previousAlarm.eventPath} - Event is not recurring, skipping`);

      return Promise.resolve({});
    }

    const valarm = vevent.getFirstSubcomponent('valarm');
    const trigger = valarm.getFirstPropertyValue('trigger');
    const triggerDuration = moment.duration(trigger);

    const expand = new ICAL.RecurExpansion({
      component: vevent,
      dtstart: getStartTimeForNextRecurringEvent(triggerDuration)
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

    function getStartTimeForNextRecurringEvent(triggerDuration) {
      const start = moment().add(triggerDuration).format();
      let result = new Date(start);

      result = new Date(result.getTime() + 60000);

      return new ICAL.Time.fromDateTimeString(result.toISOString());
    }
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
