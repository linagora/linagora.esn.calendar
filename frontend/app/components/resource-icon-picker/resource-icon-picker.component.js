(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .component('calResourceIconPicker', {
      templateUrl: '/calendar/app/components/resource-icon-picker/resource-icon-picker.html',
      bindings: {
        icon: '=?'
      },
      controller: 'CalResourceIconPickerController',
      controllerAs: 'ctrl'
    });
})(angular);
