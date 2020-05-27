module.exports = dependencies => {
  const alarm = require('./alarm')(dependencies);
  const eventMailListener = require('./event-mail-listener')(dependencies);
  const i18n = require('./i18n')(dependencies);
  const helpers = require('./helpers');
  const invitation = require('./invitation')(dependencies);
  const search = require('./search')(dependencies);
  const constants = require('./constants');

  return {
    alarm,
    constants,
    eventMailListener,
    i18n,
    invitation,
    helpers,
    search,
    start
  };

  function start(callback) {
    search.listen();
    alarm.init();
    eventMailListener.init();

    require('./messaging')(dependencies).listen();
    require('./resource')(dependencies).listen();
    require('./user')(dependencies).listen();
    require('./config')(dependencies).register();
    require('./dav-import')(dependencies).init();

    // Register the new message type event
    const message = dependencies('message');

    message.registerMessageType('event', 'EventMessage');

    callback();
  }
};

