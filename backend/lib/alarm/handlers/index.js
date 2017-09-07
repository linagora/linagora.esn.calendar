module.exports = () => {
  const handlers = {};

  return {
    getHandlers,
    getHandlersForAction,
    register
  };

  function getHandlers() {
    return handlers;
  }

  function getHandlersForAction(action) {
    return handlers[action] || [];
  }

  function register(handler) {
    if (!handler || !handler.action || !handler.uniqueId || !handler.handle) {
      throw new Error('Alarm handler not compliant');
    }

    if (!handlers[handler.action]) {
      handlers[handler.action] = [];
    }

    handlers[handler.action].push(handler);
  }
};
