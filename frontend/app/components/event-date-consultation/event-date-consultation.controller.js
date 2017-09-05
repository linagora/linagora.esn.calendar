(function() {
  'use strict';

  angular.module('esn.calendar')
         .controller('calEventDateConsultationController', calEventDateConsultationController);

  function calEventDateConsultationController() {
    var self = this,
        isAllDay = self.event.allDay,
        isOverOneDayOnly = self.event.isOverOneDayOnly(),
        eventStart = self.event.start,
        eventEnd = self.event.end;

    activate();

    ////////////

    function activate() {
      formatStartDate();
      formatEndDate();
    }

    function formatStartDate() {
      if (!isAllDay && isOverOneDayOnly) {
        self.start = eventStart.format('MMM D HH:mm');
        self.startVerbose = eventStart.format('MMM D HH:mm');
      } else if (isOverOneDayOnly) {
        self.start = self.startVerbose = eventStart.format('MMM D');
      } else {
        self.start = eventStart.format('MMM D');
        self.startVerbose = eventStart.format('MMM D');
      }
    }

    function formatEndDate() {
      if (!isAllDay && isOverOneDayOnly) {
        self.end = self.endVerbose = eventEnd.format('HH:mm');
      } else if (!isAllDay && !isOverOneDayOnly) {
        self.end = eventEnd.format('MMM D');
        self.endVerbose = eventEnd.format('MMM D');
      } else if (!isOverOneDayOnly) {
        self.end = eventEnd.clone().subtract(1, 'day').format('MMM D');
        self.endVerbose = eventEnd.clone().subtract(1, 'day').format('MMM D');
      }
    }
  }
})();
