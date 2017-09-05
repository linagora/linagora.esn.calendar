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

  function register(action, handler) {
    if (!action || !handler) {
      return;
    }

    if (!handlers[action]) {
      handlers[action] = [];
    }

    handlers[action].push(handler);
  }
};
