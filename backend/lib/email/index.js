module.exports = dependencies => {
  const sender = require('./sender')(dependencies);

  return {
    sender
  };
};
