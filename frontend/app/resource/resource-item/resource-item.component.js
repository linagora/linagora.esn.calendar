'use strict';

angular.module('esn.calendar')
  .component('calResourceItem', {
    bindings: {
      resource: '<',
      canModifyResource: '='
    },
    controller: 'CalResourceItemController',
    controllerAs: 'ctrl',
    templateUrl: '/calendar/app/resource/resource-item/resource-item.html'
  });
