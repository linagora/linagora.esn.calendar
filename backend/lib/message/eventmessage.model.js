const extend = require('extend');

module.exports = dependencies => {
  const { mongoose, models} = dependencies('db').mongo;
  const eventSpecificSchema = {
    objectType: {type: String, required: true, default: 'event'},
    eventId: {type: String, required: true}
  };

  extend(true, eventSpecificSchema, models['base-message']);
  mongoose.model('EventMessage', new mongoose.Schema(eventSpecificSchema, { collection: 'messages' }));
};
