const command = {
  command: 'event',
  desc: 'Event Management',
  builder: yargs => yargs.commandDir('event_cmds').demandCommand(1, 'Please specify a command'),
  handler: () => {}
};

module.exports = {
  command
};
