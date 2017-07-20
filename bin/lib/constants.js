module.exports = {
  url: {
    describe: 'The OpenPaaS instance URL',
    default: 'http://localhost:8080'
  },
  username: {
    describe: 'Username to login',
    demand: true
  },
  password: {
    describe: 'Password to login',
    demand: true
  },
  db: {
    events: [
      {title: 'Run', start: 8},
      {title: 'Kids', start: 8},
      {title: 'Kids', start: 18},
      {title: 'Run', start: 18},
      {title: 'Climb', start: 18},
      {title: 'Team Lunch', start: 12, duration: 2},
      {title: 'Lunch', start: 12},
      {title: 'Meeting'},
      {title: 'Team meeting'},
      {title: 'Personal stuff'},
      {title: 'Coffee', start: 9},
      {title: 'Customer'},
      {title: 'Demo'},
      {title: 'Roadmap'},
      {title: 'Code Review'},
      {title: 'Party', start: 19},
      {title: 'BBQ', start: 19},
      {title: 'Meeting'},
      {title: 'Super secret'},
      {title: 'Team building', start: 17}
    ]
  }
};
