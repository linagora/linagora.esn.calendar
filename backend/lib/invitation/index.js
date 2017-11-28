module.exports = dependencies => {
  const email = require('./email')(dependencies);
  const link = require('./link')(dependencies);

  return {
    email,
    link
  };
};
