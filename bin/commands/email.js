module.exports = {
  command: 'email',
  desc: 'Email Tests',
  builder: yargs => yargs.commandDir('email_cmds').demandCommand(1, 'Please specify a command'),
  handler: () => {}
};
