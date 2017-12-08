(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalEventViewExternalUserController', CalEventViewExternalUserController);

  function CalEventViewExternalUserController($http) {
    var self = this;

    self.$onInit = $onInit;
    self.changeParticipation = changeParticipation;
    self.isExternal = true;
    function $onInit() {
      self.userAsAttendee = Object.create(self.externalAttendee);
      self.selectedTab = 'attendees';
      self.linksMapping = {
        ACCEPTED: self.links.yes,
        TENTATIVE: self.links.maybe,
        DECLINED: self.links.no
      };
    }

    function changeParticipation(partstat) {
      self.userAsAttendee.partstat = partstat;
      $http({ method: 'GET', url: self.linksMapping[partstat] });
    }
  }
})();
