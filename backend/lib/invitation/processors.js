const processors = new Map();

module.exports = dependencies => {
  const logger = dependencies('logger');

  return {
    register,
    process
  };

  function register(methods = [], processor) {
    logger.info(`Registering calendar email processor for methods ${methods}`);

    if (!processor) {
      logger.warn('Can not register empty processor');

      return;
    }

    methods.forEach(method => {
      if (!processors.has(method)) {
        processors.set(method, new Set());
      }

      processors.get(method).add(processor);
    });
  }

  function process(method, payload) {
    if (!processors.has(method)) {
      return Promise.resolve(payload);
    }

    return waterfallPromises([...processors.get(method)], payload).catch(err => {
      logger.error('Error while processing email', err);

      return payload;
    });
  }

  function waterfallPromises(promises, args) {
    return promises.reduce((acc, promise) => acc.then(promise), Promise.resolve(args));
  }
};
