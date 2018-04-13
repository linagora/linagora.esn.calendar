(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .factory('calAttendeeService', calAttendeeService);

  function calAttendeeService($log, $q, _, userUtils, CAL_ICAL, calResourceService) {
    return {
      filterDuplicates: filterDuplicates,
      getAttendeeForUser: getAttendeeForUser,
      manageResourceDetailsPromiseResolutions: manageResourceDetailsPromiseResolutions,
      logResourceDetailsError: logResourceDetailsError,
      splitAttendeesFromType: splitAttendeesFromType,
      splitAttendeesFromTypeWithResourceDetails: splitAttendeesFromTypeWithResourceDetails,
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
        return _.contains(attendee.email, user.emails);
      });
    }

    function splitAttendeesFromType(attendees, resourcesTypeCallback) {
      var result = { users: [], resources: [] };

      (attendees || []).forEach(function(attendee) {
        if (!attendee.cutype || attendee.cutype === CAL_ICAL.cutype.individual) {
          result.users.push(attendee);
        }

        if (attendee.cutype === CAL_ICAL.cutype.resource) {
          var resource = resourcesTypeCallback ? resourcesTypeCallback(attendee) : attendee;

          result.resources.push(resource);
        }
      });

      return result;
    }

    function splitAttendeesFromTypeWithResourceDetails(attendees) {
      return $q
        .allSettled((attendees || []).reduce(function(resources, attendee) {
          if (attendee.cutype === CAL_ICAL.cutype.resource && attendee.email) {
            resources.push(calResourceService.getResource(attendee.email.split('@')[0]));
          }

          return resources;
        }, []))
        .then(function(resourcesFromDBPromises) {
          return manageResourceDetailsPromiseResolutions(resourcesFromDBPromises);
        })
        .then(function(resourcesFromDB) {
          return splitAttendeesFromType(attendees, function(attendee) {
            var resourceFromDB = attendee.email ?
                _.find(resourcesFromDB, { _id: attendee.email.split('@')[0]}) :
                undefined;
            var resource = resourceFromDB ?
                _.assign({}, attendee, { deleted: resourceFromDB.deleted }) :
                attendee;

            return resource;
          });
        })
        .catch(function(error) {
          logResourceDetailsError(error);

          return splitAttendeesFromType(attendees);
        });
    }

    function manageResourceDetailsPromiseResolutions(resourcesFromDbPromises) {
      var resourcesFromDBResolved = _.map(
        _.filter(resourcesFromDbPromises, {state: 'fulfilled'}),
        'value'
      );
      var resourcesFromDBRejected = _.map(
        _.filter(resourcesFromDbPromises, {state: 'rejected'}),
        'reason'
      );

      if (resourcesFromDBResolved.length === 0) {
        return $q.reject(resourcesFromDBRejected);
      }

      if (resourcesFromDBRejected.length > 0) {
        resourcesFromDBRejected.forEach(function(error) { logResourceDetailsError(error); });
      }

      return $q.when(resourcesFromDBResolved);
    }

    function logResourceDetailsError(error) {
      $log.error('Could not retrieve resources details', error);
    }

    function userAsAttendee(user) {
      user.email = user.preferredEmail;
      user.displayName = userUtils.displayNameOf(user);
      user.cutype = CAL_ICAL.cutype.individual;

      return user;
    }
  }
})(angular);
