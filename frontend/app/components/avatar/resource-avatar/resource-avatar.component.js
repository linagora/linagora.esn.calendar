(function() {
  'use strict';

  angular.module('esn.calendar')
    .component('calResourceAvatar', {
      templateUrl: '/calendar/app/components/avatar/resource-avatar/resource-avatar.html',
      bindings: {
        attendee: '<'
      },
      controllerAs: 'ctrl',
      controller: 'CalResourceAvatarController'
    });
})();
