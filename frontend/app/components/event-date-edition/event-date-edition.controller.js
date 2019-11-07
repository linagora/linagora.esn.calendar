(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('calEventDateEditionController', calEventDateEditionController);

  function calEventDateEditionController(calMoment, esnI18nDateFormatService) {
    var self = this;
    var previousStart;
    var previousEnd;
    var diff;

    self.$onInit = $onInit;
    self.dateOnBlurFn = dateOnBlurFn;
    self.getMinEndDate = getMinEndDate;
    self.onStartDateChange = onStartDateChange;
    self.onEndDateChange = onEndDateChange;
    self.onStartDateTimeChange = onStartDateTimeChange;
    self.onEndDateTimeChange = onEndDateTimeChange;
    self.allDayOnChange = allDayOnChange;

    function $onInit() {
      self.dateFormat = esnI18nDateFormatService.getLongDateFormat();
      self.disabled = self.disabled || false;
      self.full24HoursDay = self.event.full24HoursDay;
      self.start = calMoment(self.event.start);

      // In CalDAV backend, the end date of an all-day event is stored +1 day compared to the end date when a user saves the event.
      // Therefore, if this is an all-day event, we need to display -1 day for the end date input.
      self.end = self.full24HoursDay ? calMoment(self.event.end).subtract(1, 'days') : calMoment(self.event.end);

      // On load, ensure the duration between start and end is calculated
      _calcDateDiff();
    }

    function dateOnBlurFn() {
      // This is used to re-update views from the model in case the view is cleared
      self.start = self.start.clone();
      self.end = self.end.clone();
      if (angular.isFunction(self.dateOnBlur)) {
        self.dateOnBlur.apply(this, arguments);
      }
    }

    function getMinEndDate() {
      return self.start.clone().subtract(1, 'days').format('YYYY-MM-DD');
    }

    function allDayOnChange() {
      if (self.full24HoursDay) {
        _saveEventDateTime(self.start, self.end);
        self.start = self.start.stripTime();
        self.end = self.end.stripTime();
      // The user unchecks the 'All day' option after previously checking it.
      } else if (previousStart && previousEnd) {
        self.start = _copyTime(self.start, previousStart);
        self.end = _copyTime(self.end, previousEnd);

      // The user unchecks the 'All day' option after just opening an all-day event.
      } else {
        var nextHour = calMoment().startOf('hour').add(1, 'hour').hour();

        self.start = self.start.clone().startOf('day').hour(nextHour).utc();
        self.end = _addDefaultEventDuration(self.end.clone().startOf('day').hour(nextHour).utc());
      }

      _checkAndForceEndAfterStart();
      _calcDateDiff();
      _syncEventDateTime();
      _onDateChange();
    }

    function onStartDateChange() {
      if (!self.start || !self.start.isValid()) {
        return;
      }

      // When 'All day' is selected, strip time
      if (self.full24HoursDay) {
        self.start.stripTime();
      }

      // Move the end range from the start range plus the offset
      self.end = calMoment(self.start).add(diff / 1000, 'seconds');
      _syncEventDateTime();
      _onDateChange();
    }

    function onStartDateTimeChange() {
      // When we select a time we have to move the end time
      onStartDateChange();
    }

    function onEndDateChange() {
      if (!self.end || !self.end.isValid()) {
        return;
      }

      // When 'All day' is selected, strip time
      if (self.full24HoursDay) {
        self.end.stripTime();
      }

      _checkAndForceEndAfterStart();
      _syncEventDateTime();
      _calcDateDiff();
      _onDateChange();
    }

    function onEndDateTimeChange() {
      _checkAndForceEndAfterStart();
      _calcDateDiff();
      _syncEventDateTime();
      _onDateChange();
    }

    function _saveEventDateTime(start, end) {
      previousStart = start.clone();
      previousEnd = end.clone();
    }

    function _syncEventDateTime() {
      if (self.full24HoursDay) {
        self.event.start = self.start.clone().stripTime();
        self.event.end = self.end.clone().add(1, 'days').stripTime();

        return;
      }

      self.event.start = self.start.clone();
      self.event.end = self.end.clone();
    }

    function _addDefaultEventDuration(src) {
      return src.add(30, 'minutes'); // According to the default duration of an event
    }

    function _checkAndForceEndAfterStart() {
      if (self.full24HoursDay) return;

      // If the end of the event is the same or before the start, force the end
      if (self.end.isBefore(self.start) || self.end.isSame(self.start)) {
        self.end = _addDefaultEventDuration(self.start.clone());
      }
    }

    function _calcDateDiff() {
      diff = self.end.diff(self.start);
    }

    function _copyTime(src, ref) {
      var refUtc = ref.clone().utc();

      return src.clone().utc().startOf('day').hour(refUtc.hour()).minute(refUtc.minute());
    }

    function _onDateChange() {
      self.onDateChange && self.onDateChange({
        start: self.start.clone(),
        end: self.end.clone()
      });
    }
  }
})();
