const momentTimezone = require('moment-timezone');

module.exports = dependencies => {
  const i18n = dependencies('i18n');
  const logger = dependencies('logger');
  const supportedMomentLocales = i18n.i18nConfigTemplate.momentLocales;

  _loadMomentLocales();

  return {
    formatDatetime
  };

  function _loadMomentLocales() {
    Object.values(supportedMomentLocales).forEach(momentLocale => {
      try {
        require(`moment/locale/${momentLocale}`);
      } catch (err) {
        logger.error(`'${momentLocale}' is not a valid Moment locale. When formatting datetime with this locale, 'en' is going to be used instead.`, err);
      }
    });

    momentTimezone.locale('en');
  }

  function formatDatetime(momentDatetime, { timezone = 'UTC', locale = 'en', use24hourFormat = false }) {
    if (!momentTimezone.isMoment(momentDatetime)) {
      throw new Error('momentDatetime must be an instance of momentTimezone');
    }

    const convertedMomentDatetime = momentDatetime.tz(timezone).locale(supportedMomentLocales[locale] || 'en');

    return {
      date: convertedMomentDatetime.format('L'),
      time: convertedMomentDatetime.format(use24hourFormat ? 'HH:mm' : 'hh:mm A')
    };
  }
};
