'use strict';

angular.module('esn.calendar')
  .component('calEntitiesAutocompleteInput', {
    templateUrl: '/calendar/app/components/entities-autocomplete-input/entities-autocomplete-input.html',
    bindings: {
      excludeCurrentUser: '=?', // defaults to false
      originalEntities: '=?',
      mutableEntities: '=',
      excludeUnknownUsers: '=?',
      onEntityAdded: '=?',
      onEntityRemoved: '=?',
      onAddingEntity: '=?',
      addFromAutocompleteOnly: '=?',
      showIcon: '=?',
      placeHolder: '@?',
      showResourceIcon: '=?',
      types: '=?',
      template: '@?'
    },
    controller: 'calEntitiesAutocompleteInputController',
    controllerAs: 'ctrl'
  });
