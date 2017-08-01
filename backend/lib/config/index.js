module.exports = dependencies => {
  const esnConfig = dependencies('esn-config');
  const CONFIG = {
    rights: {
      admin: 'rw',
      user: 'r'
    },
    configurations: {
      workingDays: {
        rights: {
            padmin: 'rw',
            admin: 'rw',
            user: 'rw'
          }
      }
    }
  };

  return {
    register
  };

  function register() {
    esnConfig.registry.register('linagora.esn.calendar', CONFIG);
  }
};
