const ora = require('ora');
const client = require('esn-calendar-client');
const {constants, commons, event} = require('../../lib');
const {url, username, password} = constants;

module.exports = {
  command: 'populate',
  desc: 'Populate calendar with fake events',
  builder: {
    url,
    name: {
      describe: 'Name of the calendar',
      demand: true
    },
    weeks: {
      describe: 'The number of weeks to spread events over (starting at current one)',
      default: 0
    },
    nb: {
      describe: 'Number of events to create',
      default: 20
    },
    username,
    password
  },
  handler: argv => {
    const {name, weeks, nb, username, password, url} = argv;
    const events = event.generateFakeEvents({nb, weeks});

    Promise.all(events.map(create)).then(() => {
      commons.logInfo('Events created');
      commons.exit(0);
    }, err => {
      commons.logError('Error while creating events', err.message);
      commons.exit(-1);
    });

    function create({summary, start, duration}) {
      const msg = `Event ${summary} starting at ${start.toDate()} with duration ${duration} hour`;
      const spinner = ora(`Creating ${msg}`).start();

      return client({ auth: {username, password}, baseURL: url })
        .calendars.get(name)
        .create(event.asICAL({summary, start, duration})).then(() => {
          spinner.succeed(`${msg} has been created`);
        }, err => {
          spinner.fail(`Failed to create ${msg}`, err.message);
        });
    }
  }
};
