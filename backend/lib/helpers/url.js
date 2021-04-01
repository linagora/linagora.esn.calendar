module.exports = {
  isValidURL,
  isAbsoluteURL
};

function isValidURL(string) {
  if (typeof string !== 'string') {
    return false;
  }

  // eslint-disable-next-line no-useless-escape
  return string.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g) !== null;
}

function isAbsoluteURL(url) {
  if (typeof url !== 'string') {
    return false;
  }

  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url);
}
