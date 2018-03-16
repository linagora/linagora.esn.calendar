'use strict';

angular.module('esn.calendar')
  .component('calEventDateSuggestionSummary', {
    templateUrl: '/calendar/app/components/event-date-suggestion/summary/event-date-suggestion-summary.html',
    bindings: {
      event: '<',
      user: '<'
    }
  });
