(function() {
  'use strict';

  angular.module('esn.calendar')
    .component('calResourceList', {
      bindings: {
        canModifyResources: '=',
        resources: '=',
        onResourceRemoved: '&'
      },
      controller: 'CalResourceListController',
      controllerAs: 'ctrl',
      templateUrl: '/calendar/app/resource/resource-list/resource-list.html'
    });
})();
