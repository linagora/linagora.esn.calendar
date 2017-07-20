const fs = require('fs-extra');
const Q = require('q');
const path = require('path');
const commandsPath = path.resolve(path.join(__dirname, 'commands'));
const yargs = require('yargs');
const readdir = Q.denodeify(fs.readdir);

readdir(commandsPath).then(files => {
  files.forEach(filename => {
    const filePath = path.join(commandsPath, filename);

    if (fs.statSync(filePath).isFile()) {
      const command = require('./commands/' + filename).command;

      yargs.command(command);
    }
  });

  yargs
    .usage('Usage: $0 <command> [options]')
    .demand(1, 'You need to specify a command')
    .help()
    .version()
    .epilogue('for more information, go to https://open-paas.org')
    .example('$0 calendar --help', 'show help of calendar command')
    .argv;
});
