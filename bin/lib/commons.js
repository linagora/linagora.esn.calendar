module.exports = {
  logInfo,
  logError,
  exit,
  runCommand
};

function log(level, ...message) {
  console.log('[CLI]', level, ...message);
}

function logInfo(...message) {
  log('INFO', ...message);
}

function logError(...message) {
  log('ERROR', ...message);
}

function exit(code) {
  process.exit(code); // eslint-disable-line no-process-exit
}

function runCommand(name, command) {
  return command().then(() => {
    logInfo(`Command "${name}" terminated successfully`);

    exit();
  }, err => {
    logError(`Command "${name}" returned an error: ${err}`);

    exit(1);
  });
}
