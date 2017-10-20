'use strict';

angular.module('esn.calendar')
  .component('calResourceItem', {
    templateUrl: '/calendar/app/resource/resource-item/resource-item.html',
    bindings: {
      resource: '=',
      canModifyResource: '='
    },
    controllerAs: 'ctrl'
  });
