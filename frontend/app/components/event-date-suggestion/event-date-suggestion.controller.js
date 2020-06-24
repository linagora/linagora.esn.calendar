(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('calEventDateSuggestionController', calEventDateSuggestionController);

  function calEventDateSuggestionController(calMoment, esnI18nDateFormatService, esnDatetimeService) {
    var self = this;

    self.$onInit = $onInit;
    self.dateOnBlurFn = dateOnBlurFn;
    self.getMinDate = getMinDate;
    self.setEventDates = setEventDates;
    self.onStartDateChange = onStartDateChange;
    self.onEndDateChange = onEndDateChange;

    function $onInit() {
      self.dateFormat = esnI18nDateFormatService.getLongDateFormat();
      self.full24HoursDay = self.event.full24HoursDay;
      // on load, ensure that duration between start and end is stored inside editedEvent
      self.start = calMoment(self.event.start);
      // In CalDAV backend, the end date of a full-24-hours-day event is stored +1 day compared to the end date when a user saves the event.
      // Therefore, if this is a full-24-hours-day event, we need to display -1 day for the end date input.
      self.end = !self.full24HoursDay ? calMoment(self.event.end) : calMoment(self.event.end).subtract(1, 'days');
      self.onEndDateChange();
      _updateMinEndDate();
    }

    function dateOnBlurFn() {
      //this is used to re-update views from the model in case the view is cleared
      self.start = self.start.clone();
      self.end = self.end.clone();
    }

    function getMinDate() {
      if (self.full24HoursDay) {
        return calMoment(self.event.start).subtract(1, 'days').format('YYYY-MM-DD');
      }

      return null;
    }

    function setEventDates() {
      var start, end;

      if (self.full24HoursDay) {
        self.previousStart = self.event.start.clone();
        self.previousEnd = self.event.end.clone();

        start = self.start.stripTime();
        end = self.end.stripTime();
      } else if (self.previousStart && self.previousEnd) {
        start = self.previousStart;
        end = self.previousEnd;
      } else {
        var nextHour = calMoment().startOf('hour').add(1, 'hour').hour();

        start = esnDatetimeService.setAmbigTime(self.start.startOf('day').hour(nextHour), false);
        end = esnDatetimeService.setAmbigTime(self.end.startOf('day').hour(nextHour).add(1, 'hours'), false);
      }
      self.start = start;
      self.end = end;
      self.diff = self.end.diff(self.start);
      _syncEventDateTime();
    }

    function onStartDateChange() {
      if (!self.start || !self.start.isValid()) {
        return;
      }

      // When 'All day' is selected, strip time
      if (self.full24HoursDay) {
        self.start = self.start.stripTime();
      }
      self.end = calMoment(self.start).add(self.diff / 1000, 'seconds');
      _updateMinEndDate();
      _syncEventDateTime();
    }

    function onEndDateChange() {
      if (!self.end || !self.end.isValid()) {
        return;
      }
      if (self.end.isBefore(self.start)) {
        self.end = calMoment(self.start).add(1, 'hours');
      }
      self.diff = self.end.diff(self.start);
      _updateMinEndDate();
      _syncEventDateTime();
    }

    function _updateMinEndDate() {
      self.minEndDate = getMinDate();
    }

    function _syncEventDateTime() {
      if (self.full24HoursDay) {
        self.event.start = self.start.clone().stripTime();
        self.event.end = self.end.clone().stripTime().add(1, 'days');

        return;
      }

      self.event.start = self.start.clone();
      self.event.end = self.end.clone();
    }
  }
})();
