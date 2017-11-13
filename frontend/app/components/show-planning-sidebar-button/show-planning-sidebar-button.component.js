(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .component('calShowPlanningSidebarButton', {
      controller: 'CalShowPlanningSidebarButtonController',
      controllerAs: 'ctrl',
      templateUrl: '/calendar/app/components/show-planning-sidebar-button/show-planning-sidebar-button.html'
    });
})(angular);
