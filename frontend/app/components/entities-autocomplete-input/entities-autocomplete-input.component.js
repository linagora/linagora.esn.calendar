'use strict';

angular.module('esn.calendar')
  .component('calEntitiesAutocompleteInput', {
    templateUrl: '/calendar/app/components/entities-autocomplete-input/entities-autocomplete-input.html',
    bindings: {
      originalEntities: '=?',
      mutableEntities: '=',
      onEntityAdded: '=?',
      onEntityRemoved: '=?',
      addFromAutocompleteOnly: '=?',
      showIcon: '=?',
      placeHolder: '@?',
      showResourceIcon: '=?',
      type: '@?'
    },
    controller: 'calEntitiesAutocompleteInputController',
    controllerAs: 'ctrl'
  });
