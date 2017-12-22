'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The calAttendeeService service', function() {
  var CAL_ICAL, calAttendeeService, userUtils;

  beforeEach(function() {
    userUtils = {
      displayNameOf: sinon.stub()
    };
  });

  beforeEach(function() {
    angular.mock.module('esn.calendar');

    angular.mock.module(function($provide) {
      $provide.value('userUtils', userUtils);
    });

    angular.mock.inject(function(_CAL_ICAL_, _calAttendeeService_) {
      CAL_ICAL = _CAL_ICAL_;
      calAttendeeService = _calAttendeeService_;
    });
  });

  describe('The splitAttendeesFromType function', function() {
    it('should return empty arrays when attendees is not defined', function() {
      expect(calAttendeeService.splitAttendeesFromType()).to.deep.equals({
        users: [],
        resources: []
      });
    });

    it('should return empty arrays when attendees is empty', function() {
      expect(calAttendeeService.splitAttendeesFromType([])).to.deep.equals({
        users: [],
        resources: []
      });
    });

    it('should set attendee without cutype as user', function() {
      var attendee = { _id: 1 };

      expect(calAttendeeService.splitAttendeesFromType([attendee])).to.deep.equals({
        users: [attendee],
        resources: []
      });
    });

    it('should set attendees in correct category', function() {
      var userAttendee = { _id: 1, cutype: CAL_ICAL.cutype.individual };
      var resourceAttendee = { _id: 1, cutype: CAL_ICAL.cutype.resource };

      expect(calAttendeeService.splitAttendeesFromType([userAttendee, resourceAttendee])).to.deep.equals({
        users: [userAttendee],
        resources: [resourceAttendee]
      });
    });
  });

  describe('The getAttendeeForUser function', function() {
    var user;

    beforeEach(function() {
      user = {_id: 1, emails: ['user1@open-paas.org'], emailMap: {'user1@open-paas.org': true}};
    });

    it('should return undefined when user is not defined', function() {
      expect(calAttendeeService.getAttendeeForUser([])).to.be.undefined;
    });

    it('should return undefined when attendees is not defined', function() {
      expect(calAttendeeService.getAttendeeForUser(null, user)).to.be.undefined;
    });

    it('should return undefined when attendees is empty', function() {
      expect(calAttendeeService.getAttendeeForUser([], user)).to.be.undefined;
    });

    it('should return undefined when user is not in attendee', function() {
      var attendees = [{ email: 'user2@open-paas.org' }];

      expect(calAttendeeService.getAttendeeForUser(attendees, user)).to.be.undefined;
    });

    it('should send back the attendee', function() {
      var attendees = [{ email: 'user2@open-paas.org' }, { email: 'user1@open-paas.org'}];

      expect(calAttendeeService.getAttendeeForUser(attendees, user)).to.deep.equals(attendees[1]);
    });
  });

  describe('The filterDuplicates function', function() {
    it('should keep original values', function() {
      var attendees = [{email: 'user1@open-paas.org'}, {email: 'user2@open-paas.org'}];

      expect(calAttendeeService.filterDuplicates(attendees)).to.deep.equals(attendees);
    });

    it('should keep attendees with partstat when duplicates 1', function() {
      var attendees = [{email: 'user1@open-paas.org'}, {email: 'user2@open-paas.org', partstat: 'needs-action'}, {email: 'user2@open-paas.org'}];

      expect(calAttendeeService.filterDuplicates(attendees)).to.deep.equals([attendees[0], attendees[1]]);
    });

    it('should keep attendees with partstat when duplicates 2', function() {
      var attendees = [{email: 'user1@open-paas.org'}, {email: 'user2@open-paas.org'}, {email: 'user2@open-paas.org', partstat: 'needs-action'}];

      expect(calAttendeeService.filterDuplicates(attendees)).to.deep.equals([attendees[0], attendees[2]]);
    });
  });
});
