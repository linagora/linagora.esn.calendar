'use strict';

/* global chai: false */
/* global sinon: false */

var expect = chai.expect;

describe('the calendarAttendeeService', function() {
  var query, limit, CAL_ATTENDEE_OBJECT_TYPE, $rootScope, calendarAttendeeService;
  var attendeeService = {};
  var attendeesAllTypes;

  beforeEach(function() {
    query = 'query';
    limit = 42;

    attendeeService.addProvider = function() {};
    attendeeService.getAttendeeCandidates = function() {
      return $q.when([]);
    };

    angular.mock.module('esn.calendar');
    angular.mock.module(function($provide) {
      $provide.value('attendeeService', attendeeService);
    });

    angular.mock.inject(function(_$rootScope_, _CAL_ATTENDEE_OBJECT_TYPE_) {
      $rootScope = _$rootScope_;
      CAL_ATTENDEE_OBJECT_TYPE = _CAL_ATTENDEE_OBJECT_TYPE_;
    });
  });

  beforeEach(angular.mock.inject(function(_calendarAttendeeService_) {
    calendarAttendeeService = _calendarAttendeeService_;
  }));

  describe('the getAttendeeCandidates function', function() {
    beforeEach(function() {
      attendeesAllTypes = [CAL_ATTENDEE_OBJECT_TYPE.user, CAL_ATTENDEE_OBJECT_TYPE.resource];
    });

    it('should return a promise', function() {
      expect(calendarAttendeeService.getAttendeeCandidates('query', 10)).to.be.a.function;
    });

    it('should add a need-action partstat to all attendeeCandidates which does not have objectType', function(done) {
      attendeeService.getAttendeeCandidates = sinon.stub().returns($q.when([{_id: 'attendee1'}, {_id: 'attendee2'}]));

      calendarAttendeeService.getAttendeeCandidates(query, limit).then(function(attendeeCandidates) {
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledOnce;
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledWith(query, limit, [CAL_ATTENDEE_OBJECT_TYPE.user]);
        expect(attendeeCandidates).to.shallowDeepEqual([{_id: 'attendee1', partstat: 'NEEDS-ACTION'}, {_id: 'attendee2', partstat: 'NEEDS-ACTION'}]);
        done();
      }, done);

      $rootScope.$apply();
    });

    it('should add a need-action partstat to all user attendeeCandidates', function(done) {
      attendeeService.getAttendeeCandidates = sinon.stub().returns($q.when([{_id: 'attendee1', objectType: CAL_ATTENDEE_OBJECT_TYPE.user}, {_id: 'attendee2', objectType: CAL_ATTENDEE_OBJECT_TYPE.user}]));

      calendarAttendeeService.getAttendeeCandidates(query, limit).then(function(attendeeCandidates) {
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledOnce;
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledWith(query, limit, [CAL_ATTENDEE_OBJECT_TYPE.user]);
        expect(attendeeCandidates).to.shallowDeepEqual([{_id: 'attendee1', partstat: 'NEEDS-ACTION'}, {_id: 'attendee2', partstat: 'NEEDS-ACTION'}]);
        done();
      }, done);

      $rootScope.$apply();
    });

    it('should add an tentative partstat to all resource attendeeCandidates', function(done) {
      attendeeService.getAttendeeCandidates = sinon.stub().returns($q.when([{_id: 'attendee1', objectType: CAL_ATTENDEE_OBJECT_TYPE.resource}, {_id: 'attendee2', objectType: CAL_ATTENDEE_OBJECT_TYPE.resource}]));

      calendarAttendeeService.getAttendeeCandidates(query, limit, attendeesAllTypes).then(function(attendeeCandidates) {
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledOnce;
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledWith(query, limit, attendeesAllTypes);
        expect(attendeeCandidates).to.shallowDeepEqual([{_id: 'attendee1', partstat: 'TENTATIVE'}, {_id: 'attendee2', partstat: 'TENTATIVE'}]);
        done();
      }, done);

      $rootScope.$apply();
    });

    it('should add a need-action partstat to all attendeeCandidates which are not recognized', function(done) {
      attendeeService.getAttendeeCandidates = sinon.stub().returns($q.when([{_id: 'attendee1', objectType: 'this is not a supported objectType'}, {_id: 'attendee2'}]));

      calendarAttendeeService.getAttendeeCandidates(query, limit).then(function(attendeeCandidates) {
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledOnce;
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledWith(query, limit, [CAL_ATTENDEE_OBJECT_TYPE.user]);
        expect(attendeeCandidates).to.shallowDeepEqual([{_id: 'attendee1', partstat: 'NEEDS-ACTION'}, {_id: 'attendee2', partstat: 'NEEDS-ACTION'}]);
        done();
      }, done);

      $rootScope.$apply();
    });

    it('should add an individual cutype to all attendeeCandidates which does not have objectType', function(done) {
      attendeeService.getAttendeeCandidates = sinon.stub().returns($q.when([{_id: 'attendee1'}, {_id: 'attendee2'}]));

      calendarAttendeeService.getAttendeeCandidates(query, limit).then(function(attendeeCandidates) {
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledOnce;
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledWith(query, limit, [CAL_ATTENDEE_OBJECT_TYPE.user]);
        expect(attendeeCandidates).to.shallowDeepEqual([{_id: 'attendee1', cutype: 'INDIVIDUAL'}, {_id: 'attendee2', cutype: 'INDIVIDUAL'}]);
        done();
      }, done);

      $rootScope.$apply();
    });

    it('should add an individual cutype to all user attendeeCandidates', function(done) {
      attendeeService.getAttendeeCandidates = sinon.stub().returns($q.when([{_id: 'attendee1', objectType: CAL_ATTENDEE_OBJECT_TYPE.user}, {_id: 'attendee2', objectType: CAL_ATTENDEE_OBJECT_TYPE.user}]));

      calendarAttendeeService.getAttendeeCandidates(query, limit, attendeesAllTypes).then(function(attendeeCandidates) {
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledOnce;
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledWith(query, limit, attendeesAllTypes);
        expect(attendeeCandidates).to.shallowDeepEqual([{_id: 'attendee1', cutype: 'INDIVIDUAL'}, {_id: 'attendee2', cutype: 'INDIVIDUAL'}]);
        done();
      }, done);

      $rootScope.$apply();
    });

    it('should add a resource cutype to all resource attendeeCandidates', function(done) {
      attendeeService.getAttendeeCandidates = sinon.stub().returns($q.when([{_id: 'attendee1', objectType: CAL_ATTENDEE_OBJECT_TYPE.resource}, {_id: 'attendee2', objectType: CAL_ATTENDEE_OBJECT_TYPE.resource}]));

      calendarAttendeeService.getAttendeeCandidates(query, limit, attendeesAllTypes).then(function(attendeeCandidates) {
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledOnce;
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledWith(query, limit, attendeesAllTypes);
        expect(attendeeCandidates).to.shallowDeepEqual([{_id: 'attendee1', cutype: 'RESOURCE'}, {_id: 'attendee2', cutype: 'RESOURCE'}]);
        done();
      }, done);

      $rootScope.$apply();
    });

    it('should add an individual cutype to all attendeeCandidates which are not recognized', function(done) {
      attendeeService.getAttendeeCandidates = sinon.stub().returns($q.when([{_id: 'attendee1', objectType: 'this is not a supported objectType'}, {_id: 'attendee2'}]));

      calendarAttendeeService.getAttendeeCandidates(query, limit).then(function(attendeeCandidates) {
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledOnce;
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledWith(query, limit, [CAL_ATTENDEE_OBJECT_TYPE.user]);
        expect(attendeeCandidates).to.shallowDeepEqual([{_id: 'attendee1', cutype: 'INDIVIDUAL'}, {_id: 'attendee2', cutype: 'INDIVIDUAL'}]);
        done();
      }, done);

      $rootScope.$apply();
    });

    it('should filter attendeeCandidates with default type when type is not an array', function(done) {
      var attendeeTypes = 'test';

      attendeeService.getAttendeeCandidates = sinon.stub().returns($q.when([]));

      calendarAttendeeService.getAttendeeCandidates(query, limit, attendeeTypes).then(function() {
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledOnce;
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledWith(query, limit, [CAL_ATTENDEE_OBJECT_TYPE.user]);
        done();
      }, done);

      $rootScope.$apply();
    });

    it('should filter attendeeCandidates with types when specified', function(done) {
      var attendeeTypes = ['test'];

      attendeeService.getAttendeeCandidates = sinon.stub().returns($q.when([]));

      calendarAttendeeService.getAttendeeCandidates(query, limit, attendeeTypes).then(function() {
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledOnce;
        expect(attendeeService.getAttendeeCandidates).to.have.been.calledWith(query, limit, attendeeTypes);
        done();
      }, done);

      $rootScope.$apply();
    });
  });
});
