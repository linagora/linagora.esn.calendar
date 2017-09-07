module.exports = () => {
  const handlers = {};

  return {
    get,
    getHandlers,
    register
  };

  function get(action) {
    return handlers[action] || [];
  }

  function getHandlers() {
    return handlers;
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
