(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .factory('calAttendeeService', calAttendeeService);

  function calAttendeeService(_, userUtils, CAL_ICAL) {
    return {
      filterDuplicates: filterDuplicates,
      getAttendeeForUser: getAttendeeForUser,
      splitAttendeesFromType: splitAttendeesFromType,
      userAsAttendee: userAsAttendee
    };

    function filterDuplicates(attendees) {
      var attendeesMap = {};

      attendees.forEach(function(attendee) {
        if (!attendeesMap[attendee.email] || !attendeesMap[attendee.email].partstat) {
          attendeesMap[attendee.email] = attendee;
        }
      });

      return _.values(attendeesMap);
    }

    function getAttendeeForUser(attendees, user) {
      if (!user || !attendees) {
        return;
      }

      return _.find(attendees, function(attendee) {
        return attendee.email in (user.emailMap || []);
      });
    }

    function splitAttendeesFromType(attendees) {
      var result = { users: [], resources: [] };

      (attendees || []).forEach(function(attendee) {
        if (!attendee.cutype || attendee.cutype === CAL_ICAL.cutype.individual) {
          result.users.push(attendee);
        }

        if (attendee.cutype === CAL_ICAL.cutype.resource) {
          result.resources.push(attendee);
        }
      });

      return result;
    }

    function userAsAttendee(user) {
      user.email = user.preferredEmail;
      user.displayName = userUtils.displayNameOf(user);
      user.cutype = CAL_ICAL.cutype.individual;

      return user;
    }
  }
})(angular);