const jcalHelper = require('./jcal');
const eventHelper = require('./event');
const ICAL = require('@linagora/ical.js');

module.exports = {
  parseMessage
};

function parseMessage(msg) {
  return {
    eventPath: eventHelper.parseEventPath(msg.eventPath),
    event: jcalHelper.jcal2content((new ICAL.Component(msg.event)).toString(), '')
  };
}
