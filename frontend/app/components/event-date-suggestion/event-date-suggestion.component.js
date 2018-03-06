'use strict';

angular.module('esn.calendar')
  .component('calEventDateSuggestion', {
    templateUrl: '/calendar/app/components/event-date-suggestion/event-date-suggestion.html',
    controller: 'calEventDateSuggestionController',
    controllerAs: 'ctrl',
    bindings: {
      event: '<',
      dateOnBlur: '=?',
      allDayOnChange: '=?',
      use24hourFormat: '<',
      onSubmit: '&?'
    }
  });
