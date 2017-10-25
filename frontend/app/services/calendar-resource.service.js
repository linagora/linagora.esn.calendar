(function() {
  'use strict';

  angular.module('esn.calendar')
    .factory('calResourceService', calResourceService);

  function calResourceService(calendarResourceRestangular) {
    return {
      acceptResourceReservation: acceptResourceReservation,
      declineResourceReservation: declineResourceReservation
    };

    function acceptResourceReservation(resourceId, eventId) {
      return calendarResourceRestangular.one(resourceId).one(eventId).one('participation').get({ status: 'ACCEPTED' });
    }

    function declineResourceReservation(resourceId, eventId) {
      return calendarResourceRestangular.one(resourceId).one(eventId).one('participation').get({ status: 'DECLINED' });
    }
  }

})();
