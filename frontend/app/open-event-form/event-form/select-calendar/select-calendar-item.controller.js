(function(angular) {
  'use strict';

  angular.module('esn.calendar').controller('CalEventFormSelectCalendarItemController', CalEventFormSelectCalendarItemController);

  function CalEventFormSelectCalendarItemController(userUtils, session) {
    var self = this;

    self.$onInit = $onInit;

    function $onInit() {
      setDetails();
    }

    function setDetails() {
      return self.calendar.getOwner().then(function(user) {
        if (user && user._id !== session.user._id) {
          self.details = userUtils.displayNameOf(user);
        }
      });
    }
  }
})(angular);
