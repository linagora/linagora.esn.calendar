module.exports = {
  command: 'invitation',
  desc: 'Invitation Management',
  builder: yargs => yargs.commandDir('invitation_cmds').demandCommand(1, 'Please specify a command'),
  handler: () => {}
};
