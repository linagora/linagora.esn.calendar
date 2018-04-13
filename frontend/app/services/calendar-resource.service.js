(function() {
  'use strict';

  angular.module('esn.calendar')
    .factory('calResourceService', calResourceService);

  function calResourceService(
    calendarResourceRestangular,
    esnResourceAPIClient,
    CAL_RESOURCE,
    Restangular
  ) {
    return {
      acceptResourceReservation: acceptResourceReservation,
      declineResourceReservation: declineResourceReservation,
      getResource: getResource,
      getResourceIcon: getResourceIcon
    };

    function acceptResourceReservation(resourceId, eventId) {
      return calendarResourceRestangular.one(resourceId).one(eventId).one('participation').get({ status: 'ACCEPTED' });
    }

    function declineResourceReservation(resourceId, eventId) {
      return calendarResourceRestangular.one(resourceId).one(eventId).one('participation').get({ status: 'DECLINED' });
    }

    function getResource(id) {
      return esnResourceAPIClient.get(id).then(function(response) {
        return Restangular.stripRestangular(response.data);
      });
    }

    function getResourceIcon(id) {
      return getResource(id).then(function(resource) {
        return resource.icon ? CAL_RESOURCE.ICONS[resource.icon] : CAL_RESOURCE.DEFAULT_ICON;
      });
    }
  }

})(angular);
