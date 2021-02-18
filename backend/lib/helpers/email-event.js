const jcalHelper = require('./jcal');

module.exports = dependencies => {
  const datetimeHelper = require('./datetime')(dependencies);

  return {
    getContentEventStartAndEnd
  };

  function getContentEventStartAndEnd({ ics, isAllDay, timezone, use24hourFormat, locale }) {
    const convertTzOptions = { timezone, locale, use24hourFormat };
    const icalEvent = jcalHelper.getIcalEvent(ics);
    const {
      date: startDateString,
      time: startTimeString,
      fullDate: startFullDateString,
      fullDateTime: startFullDateTimeString
    } = datetimeHelper.formatDatetime(jcalHelper.getIcalDateAsMoment(icalEvent.startDate), convertTzOptions);
    const {
      date: endDateString,
      time: endTimeString,
      fullDate: endFullDateString,
      fullDateTime: endFullDateTimeString
    } = datetimeHelper.formatDatetime(isAllDay ? jcalHelper.getIcalDateAsMoment(icalEvent.endDate).subtract(1, 'day') : jcalHelper.getIcalDateAsMoment(icalEvent.endDate), convertTzOptions);

    return {
      start: {
        date: startDateString,
        time: startTimeString,
        fullDate: startFullDateString,
        fullDateTime: startFullDateTimeString,
        timezone
      },
      end: {
        date: endDateString,
        time: endTimeString,
        fullDate: endFullDateString,
        fullDateTime: endFullDateTimeString,
        timezone
      }
    };
  }
};
