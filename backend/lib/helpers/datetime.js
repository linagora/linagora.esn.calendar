const momentTimezone = require('moment-timezone');

module.exports = dependencies => {
  const i18n = dependencies('i18n');
  const logger = dependencies('logger');
  const defaultMomentI18nConfig = {
    momentLocales: {},
    customMomentFormat: {},
    momentLocalesOverrideConfig: {}
  };
  const momentConfig = i18n.i18nConfigTemplate.moment || defaultMomentI18nConfig;
  const { momentLocales: supportedMomentLocales, customMomentFormat, momentLocalesOverrideConfig } = momentConfig;
  const missingOverrideConfigLocales = [];

  _loadMomentLocales();

  return {
    formatDatetime
  };

  function _loadMomentLocales() {
    [...Object.values(supportedMomentLocales), 'en'].forEach(momentLocale => {
      try {
        if (momentLocale !== 'en') require(`moment/locale/${momentLocale}`);

        if (!momentLocalesOverrideConfig[momentLocale]) {
          missingOverrideConfigLocales.push(momentLocale);

          // Every supported language needs to have its config overriden to support the custom date format.
          // The place to override the config is in ESN: backend/core/i18n/moment.js.
          return logger.error(`There is no override config for the current locale (${momentLocale}).`);
        }

        momentTimezone.updateLocale(momentLocale, momentLocalesOverrideConfig[momentLocale]);
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

    const targetLocale = supportedMomentLocales[locale] || 'en';
    const convertedMomentDatetime = momentDatetime.tz(timezone).locale(targetLocale);
    const isLocaleMissingOverrideConfig = missingOverrideConfigLocales.includes(targetLocale);
    const fullDateTime24HoursFormat = isLocaleMissingOverrideConfig || !customMomentFormat.fullDateTime24Hours ? 'LLLL' : customMomentFormat.fullDateTime24Hours;
    const fullDateTime12HoursFormat = isLocaleMissingOverrideConfig || !customMomentFormat.fullDateTime12Hours ? 'LLLL' : customMomentFormat.fullDateTime12Hours;
    const fullDateFormat = isLocaleMissingOverrideConfig || !customMomentFormat.fullDate ? 'LL' : customMomentFormat.fullDate;

    return {
      date: convertedMomentDatetime.format('L'),
      time: convertedMomentDatetime.format(use24hourFormat ? 'HH:mm' : 'hh:mm A'),
      fullDateTime: convertedMomentDatetime.format(use24hourFormat ? fullDateTime24HoursFormat : fullDateTime12HoursFormat),
      fullDate: convertedMomentDatetime.format(fullDateFormat)
    };
  }
};
