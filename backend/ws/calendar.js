'use strict';

var initialized = false;
var NAMESPACE = '/calendars';
var jcalHelper = require('../lib/jcal/jcalHelper');
var PUBSUB_EVENT = 'calendar:event:updated';
var WS_EVENTS = {
  EVENT_CREATED: 'calendar:ws:event:created',
  EVENT_UPDATED: 'calendar:ws:event:updated',
  EVENT_DELETED: 'calendar:ws:event:deleted'
};

function notify(io, ioHelper, event, msg) {
  var clientSockets = ioHelper.getUserSocketsFromNamespace(msg.target._id, io.of(NAMESPACE).sockets);
  if (!clientSockets) {
    return;
  }

  clientSockets.forEach(function(socket) {
    socket.emit(event, msg.event);
  });
}

function init(dependencies) {
  var logger = dependencies('logger');
  var pubsub = dependencies('pubsub');
  var io = dependencies('wsserver').io;
  var ioHelper = dependencies('wsserver').ioHelper;
  var userModule = dependencies('user');

  if (initialized) {
    logger.warn('The calendar notification service is already initialized');
    return;
  }

  pubsub.global.topic(PUBSUB_EVENT).subscribe(function(msg) {
    notify(io, ioHelper, msg.websocketEvent, msg);
  });

  io.of(NAMESPACE)
    .on('connection', function(socket) {
      logger.info('New connection on ' + NAMESPACE);

      socket.on('subscribe', function(uuid) {
        logger.info('Joining room', uuid);
        socket.join(uuid);
      });

      socket.on('unsubscribe', function(uuid) {
        logger.info('Leaving room', uuid);
        socket.leave(uuid);
      });

      function _notify(email, calendarShell, websocketEvent) {
        userModule.findByEmail(email, function(err, user) {
          if (err || !user) {
            logger.error('Could not notify event update for : ', email);
            return;
          }
          var msg = {
            target: user,
            event: calendarShell,
            websocketEvent: websocketEvent
          };
          pubsub.local.topic(PUBSUB_EVENT).forward(pubsub.global, msg);
        });
      }

      function _notifyAttendees(calendarShell, websocketEvent) {
        var attendeesEmails = jcalHelper.getAttendeesEmails(calendarShell.vcalendar);
        attendeesEmails.forEach(function(email) {
          _notify(email, calendarShell, websocketEvent);
        });
      }

      function _notifyOrganizer(calendarShell, websocketEvent) {
        _notify(jcalHelper.getOrganizerEmail(calendarShell.vcalendar), calendarShell, websocketEvent);
      }

      socket.on(WS_EVENTS.EVENT_CREATED, function(data) {
        _notifyAttendees(data, WS_EVENTS.EVENT_CREATED);
      });
      socket.on(WS_EVENTS.EVENT_UPDATED, function(data) {
        _notifyAttendees(data, WS_EVENTS.EVENT_UPDATED);
        _notifyOrganizer(data, WS_EVENTS.EVENT_UPDATED);
      });
      socket.on(WS_EVENTS.EVENT_DELETED, function(data) {
        _notifyAttendees(data, WS_EVENTS.EVENT_DELETED);
        _notifyOrganizer(data, WS_EVENTS.EVENT_DELETED);
      });
    });

  initialized = true;
}

module.exports.init = init;