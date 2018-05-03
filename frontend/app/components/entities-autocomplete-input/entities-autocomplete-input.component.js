'use strict';

angular.module('esn.calendar')
  .component('calEntitiesAutocompleteInput', {
    templateUrl: '/calendar/app/components/entities-autocomplete-input/entities-autocomplete-input.html',
    bindings: {
      originalEntities: '=?',
      mutableEntities: '=',
      onEntityAdded: '=?',
      onEntityRemoved: '=?',
      onAddingEntity: '=?',
      addFromAutocompleteOnly: '=?',
      showIcon: '=?',
      placeHolder: '@?',
      showResourceIcon: '=?',
      types: '@?',
      template: '@?'
    },
    controller: 'calEntitiesAutocompleteInputController',
    controllerAs: 'ctrl'
  });
