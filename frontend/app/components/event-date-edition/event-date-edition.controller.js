(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('calEventDateEditionController', calEventDateEditionController);

  function calEventDateEditionController(calMoment, esnI18nDateFormatService) {
    var self = this;

    self.$onInit = $onInit;
    self.dateOnBlurFn = dateOnBlurFn;
    self.getMinDate = getMinDate;
    self.onStartDateChange = onStartDateChange;
    self.onEndDateChange = onEndDateChange;
    self.onStartDateTimeChange = onStartDateTimeChange;
    self.onEndDateTimeChange = onEndDateTimeChange;
    self.allDayOnChange = allDayOnChange;

    function $onInit() {
      self.dateFormat = esnI18nDateFormatService.getLongDateFormat();
      self.disabled = angular.isDefined(self.disabled) ? self.disabled : false;
      self.allDayOnChange = self.allDayOnChange || angular.noop;
      self.full24HoursDay = self.event.full24HoursDay;
      // on load, ensure that duration between start and end is stored inside editedEvent
      _calcDateDiff();
    }

    function dateOnBlurFn() {
      //this is used to re-update views from the model in case the view is cleared
      self.event.start = self.event.start.clone();
      self.event.end = self.event.end.clone();
      if (angular.isFunction(self.dateOnBlur)) {
        self.dateOnBlur.apply(this, arguments);
      }
    }

    function getMinDate() {
      return calMoment(self.event.start).subtract(1, 'days').format('YYYY-MM-DD');
    }

    function _getDefaultEvent() {
      var start, end;

      // When opening a registred daily event the first time
      var nextHour = calMoment().utc().startOf('hour').add(1, 'hour').hour();

      // See Ambiguously-timed Moments http://fullcalendar.io/docs/utilities/Moment/
      start = self.event.start.clone().utc().startOf('day').hour(nextHour);
      end = self.event.end.clone().utc().startOf('day').subtract(1, 'day').hour(nextHour);
      if (end.isBefore(start)) {
        end = calMoment(start);
      }
      end = _addDefaultEventduration(end);

      return {
        start: start,
        end: end
      };

    }

    function _saveEvent(start, end) {
      // Used to store the previous time
      self.previousStart = start.clone();
      self.previousEnd = end.clone();
    }

    function allDayOnChange() {
      var start, end;

      if (self.full24HoursDay) {
        _saveEvent(self.event.start, self.event.end);
        // Strip time for the range
        start = self.event.start.stripTime();
        end = self.event.end.stripTime();
        // Set the end range one day later
        end.add(1, 'days');

      // The user unchecked the allDay
      } else if (self.previousStart && self.previousEnd) {
        // Retrieve the previous times
        start = _copyTime(self.event.start, self.previousStart);
        end = _copyTime(self.event.end, self.previousEnd);

        // Move to the day before because the last end event was at midnight
        end = end.subtract(1, 'day');

      // The user just opened the all day event after unckecking the allDay
      } else {
        var defaultEvent = _getDefaultEvent();

        start = defaultEvent.start;
        end = defaultEvent.end;
      }
      self.event.start = start;
      self.event.end = end;
      _checkAndForceEndAfterStart();
      _calcDateDiff();
      _onDateChange();
    }

    function onEndDateChange(skipDateUpdate) {
      if (!self.event.end || !self.event.end.isValid()) {
        return;
      }

      // When in allDay mode, strip time
      if (self.allDay) {
        self.event.end.stripTime();
      }

      _checkAndForceEndAfterStart();
      _calcDateDiff(skipDateUpdate);
    }

    function onEndDateTimeChange() {
      _checkAndForceEndAfterStart();
      _calcDateDiff();
      _onDateChange();
    }

    function onStartDateChange() {
      if (!self.event.start || !self.event.start.isValid()) {
        return;
      }

      // When in allDay mode, strip time
      if (self.allDay) {
        self.event.start.stripTime();
      }

      // Move the end range from the start range plus the offset
      self.event.end = calMoment(self.event.start).add(self.diff / 1000, 'seconds');
      _onDateChange();
    }

    function onStartDateTimeChange() {
      // When we select a time we have to move the end time
      onStartDateChange();
    }

    function _addDefaultEventduration(src) {
      return src.add(30, 'minutes'); // According to the default duration of an event
    }

    function _checkAndForceEndAfterStart() {
      // If the end of the event is the same or before the start, force the end
      if (self.event.end.isBefore(self.event.start) || self.event.end.isSame(self.event.start)) {
        self.event.end = _addDefaultEventduration(calMoment(self.event.start));
      }
    }

    function _calcDateDiff() {
      self.diff = self.event.end.diff(self.event.start);
    }

    function _copyTime(src, ref) {
      var refUtc = ref.clone().utc();

      return src.clone().utc().startOf('day').hour(refUtc.hour()).minute(refUtc.minute());
    }

    function _onDateChange() {
      self.onDateChange && self.onDateChange({
        start: self.event.start.clone(),
        end: self.event.end.clone()
      });
    }
  }
})();
