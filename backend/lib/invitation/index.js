module.exports = dependencies => {
  const email = require('./email')(dependencies);

  return {
    email
  };
};
