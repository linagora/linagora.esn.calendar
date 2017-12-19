const { DEFAULT_EVENT_SUMMARY } = require('../constants');

module.exports = dependencies => {
  const i18nLib = require('../i18n')(dependencies);

  return {
    getEventSummaryForUser
  };

  function getEventSummaryForUser(title, user) {
    title = title ? title.trim() : DEFAULT_EVENT_SUMMARY;

    return title.trim() === DEFAULT_EVENT_SUMMARY ? i18nLib.getI18nForMailer(user).then(i18nConf => i18nConf.translate(DEFAULT_EVENT_SUMMARY)) : Promise.resolve(title);
  }
};
