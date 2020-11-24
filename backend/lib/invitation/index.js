module.exports = dependencies => {
  const email = require('./email')(dependencies);
  const link = require('./link')(dependencies);
  const processors = require('./processors')(dependencies);
  const pubsub = require('./pubsub')(dependencies);

  pubsub.init();

  return {
    email,
    link,
    processors
  };
};
