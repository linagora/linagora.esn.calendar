(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalResourceIconPickerController', CalResourceIconPickerController);

  function CalResourceIconPickerController($modal, CAL_RESOURCE) {
    var self = this;

    self.RESOURCE_ICONS = CAL_RESOURCE.ICONS;
    self.iconKeys = Object.keys(self.RESOURCE_ICONS);
    self.set = set;
    self.select = select;
    self.isSelected = isSelected;
    self.openModal = openModal;

    ////////////

    function set() {
      if (self.selected) {
        self.icon = self.selected;
      }
    }

    function select(icon) {
      self.selected = icon;
    }

    function isSelected(icon) {
      return self.selected === icon;
    }

    function openModal() {
      self.selected = self.icon;

      $modal({
        templateUrl: '/calendar/app/components/resource-icon-picker/modal/resource-icon-picker-modal.html',
        controller: function($scope) {
          angular.extend($scope, self);
        },
        backdrop: 'static',
        placement: 'center'
      });
    }
  }
})(angular);
