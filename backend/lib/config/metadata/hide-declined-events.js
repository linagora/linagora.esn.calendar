module.exports = dependencies => {
  const { createValidator } = dependencies('esn-config').validator.helper;

  const schema = {
    type: 'boolean',
    default: false
  };

  return {
    rights: {
      padmin: 'rw',
      admin: 'rw',
      user: 'rw'
    },
    validator: createValidator(schema)
  };
};
