(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .factory('calAttendeesDenormalizerService', calAttendeesDenormalizerService);

  function calAttendeesDenormalizerService(_, $q, calAttendeeService, esnMemberResolverRegistry) {
    var identityResolver = _.identity;

    var resolvers = {
      group: groupMemberResolver,
      individual: identityResolver,
      resource: identityResolver
    };

    return denormalize;

    function denormalize(attendees) {
      return $q.all(attendees.map(function(attendee) {
        return (attendee.cutype ? resolvers[attendee.cutype.toLowerCase()] || identityResolver : identityResolver)(attendee);
      })).then(function(results) {
        return _.flatten(results);
      });
    }

    function groupMemberResolver(attendee) {
      var resolver = esnMemberResolverRegistry.getResolver('group');

      if (!resolver) {
        return attendee;
      }

      return resolver.resolve(attendee.email).then(function(members) {
        return members.map(function(member) {
          return calAttendeeService.userAsAttendee(member.member);
        });
      });
    }
  }
})(angular);
