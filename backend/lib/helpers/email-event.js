const jcalHelper = require('./jcal');

module.exports = dependencies => {
  const datetimeHelper = require('./datetime')(dependencies);

  return {
    getContentEventStartAndEnd,
    getContentEventStartAndEndFromIcs
  };

  function getContentEventStartAndEnd({ start, end, isAllDay, timezone, use24hourFormat, locale }) {
    const convertTzOptions = { timezone, locale, use24hourFormat };
    const contentEventDateTimeObject = {};

    if (start) {
      contentEventDateTimeObject.start = { ...datetimeHelper.formatDatetime(start, convertTzOptions), timezone };
    }

    if (end) {
      contentEventDateTimeObject.end = { ...datetimeHelper.formatDatetime(isAllDay ? end.subtract(1, 'day') : end, convertTzOptions), timezone };
    }

    return contentEventDateTimeObject;
  }

  function getContentEventStartAndEndFromIcs({ ics, isAllDay, timezone, use24hourFormat, locale }) {
    const icalEvent = jcalHelper.getIcalEvent(ics);

    return getContentEventStartAndEnd({
      start: jcalHelper.getIcalDateAsMoment(icalEvent.startDate),
      end: jcalHelper.getIcalDateAsMoment(icalEvent.endDate),
      isAllDay,
      timezone,
      use24hourFormat,
      locale
    });
  }
};
