module.exports = dependencies => {
  const { createValidator } = dependencies('esn-config').validator.helper;

  const schema = {
    properties: {
      secretLinkSettings: {
        type: 'array',
        items: {
          calendarId: {
            type: 'string'
          },
          token: {
            type: 'string'
          }
        }
      }
    }
  };

  return {
    rights: {
      padmin: 'rw',
      admin: 'rw',
      user: 'r'
    },
    validator: createValidator(schema)
  };
};
