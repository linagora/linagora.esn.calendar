'use strict';

angular.module('esn.calendar')
  .component('calResourceItem', {
    bindings: {
      resource: '<',
      canModifyResource: '=',
      remove: '&'
    },
    controller: 'CalResourceItemController',
    controllerAs: 'ctrl',
    templateUrl: '/calendar/app/resource/resource-item/resource-item.html'
  });
