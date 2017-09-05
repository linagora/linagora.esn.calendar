'use strict';

module.exports = {
  EVENT_MAIL_LISTENER: {
    FALLBACK_EXCHANGE: 'james:events'
  },
  MODE: {
    IMPORT: 'import'
  },
  NOTIFICATIONS: {
    EVENT_ADDED: 'events:event:add',
    EVENT_UPDATED: 'events:event:update',
    EVENT_DELETED: 'events:event:delete'
  },
  SEARCH: {
    INDEX_NAME: 'events.idx',
    TYPE_NAME: 'events',
    DEFAULT_LIMIT: 20,
    DEFAULT_SORT_KEY: 'start',
    DEFAULT_SORT_ORDER: 'desc'
  },
  VALARM_ACTIONS: {
    DISPLAY: 'DISPLAY',
    EMAIL: 'EMAIL'
  },
  EVENTS: {
    CALENDAR: {
      CREATED: 'calendar:calendar:created',
      UPDATED: 'calendar:calendar:updated',
      DELETED: 'calendar:calendar:deleted'
    },
    SUBSCRIPTION: {
      CREATED: 'calendar:subscription:created',
      DELETED: 'calendar:subscription:deleted',
      UPDATED: 'calendar:subscription:updated'
    },
    EVENT: {
      CREATED: 'calendar:event:created',
      UPDATED: 'calendar:event:updated',
      REQUEST: 'calendar:event:request',
      CANCEL: 'calendar:event:cancel',
      DELETED: 'calendar:event:deleted',
      REPLY: 'calendar:event:reply'
    }
  },
  WEBSOCKET: {
    NAMESPACE: '/calendars'
  },
  ALARM: {
    STATE: {
      DONE: 'done',
      ERROR: 'error',
      RUNNING: 'running',
      WAITING: 'waiting'
    }
  }
};
