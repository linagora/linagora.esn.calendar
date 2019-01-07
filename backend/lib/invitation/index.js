module.exports = dependencies => {
  const email = require('./email')(dependencies);
  const link = require('./link')(dependencies);
  const processors = require('./processors')(dependencies);

  return {
    email,
    link,
    processors
  };
};
