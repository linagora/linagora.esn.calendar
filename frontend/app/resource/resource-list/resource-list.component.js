(function() {
  'use strict';

  angular.module('esn.calendar')
    .component('calResourceList', {
      bindings: {
        canModifyResources: '=',
        resources: '=',
        onResourcesRemoved: '&'
      },
      controller: 'CalResourceListController',
      controllerAs: 'ctrl',
      templateUrl: '/calendar/app/resource/resource-list/resource-list.html'
    });
})();
