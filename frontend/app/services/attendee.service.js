(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .factory('calAttendeeService', calAttendeeService);

  function calAttendeeService(userUtils, CAL_ICAL) {
    return {
      userAsAttendee: userAsAttendee
    };

    function userAsAttendee(user) {
      user.email = user.preferredEmail;
      user.displayName = userUtils.displayNameOf(user);
      user.cutype = CAL_ICAL.cutype.individual;

      return user;
    }
  }
})(angular);
