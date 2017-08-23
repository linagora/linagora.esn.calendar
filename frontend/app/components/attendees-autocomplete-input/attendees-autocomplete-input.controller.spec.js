'use strict';

/* global chai: false */

var expect = chai.expect;

describe('The calAttendeesAutocompleteInputController', function() {

  var $rootScope, $scope, $controller, calendarAttendeeService, session, calEventsProviders, CAL_AUTOCOMPLETE_MAX_RESULTS;

  beforeEach(function() {
    session = {
      user: {
        _id: '123456',
        emails: ['user1@test.com'],
        emailMap: {'user1@test.com': true}
      },
      domain: {
        company_name: 'test',
        _id: 'domainId'
      },
      ready: {
        then: function() {
        }
      }
    };

    calendarAttendeeService = {
      getAttendeeCandidates: function() {
        return $q.when([
          {
            email: 'user1@test.com',
            emails: ['user1@test.com'],
            id: '111111',
            firstname: 'first',
            lastname: 'last',
            partstat: 'NEEDS-ACTION',
            preferredEmail: 'user1@test.com'
          },
          {
            displayName: 'contact2',
            email: 'user2@test.com',
            emails: ['user2@test.com'],
            id: '222222',
            partstat: 'NEEDS-ACTION',
            preferredEmail: 'user2@test.com'
          },
          {
            displayName: 'contact3',
            email: 'user3@test.com',
            emails: ['user3@test.com'],
            firstname: 'john',
            id: '333333',
            lastname: 'doe',
            partstat: 'NEEDS-ACTION',
            preferredEmail: 'user3@test.com'
          },
          {
            displayName: 'contact4',
            email: 'user4@test.com',
            emails: ['user4@test.com'],
            id: '444444',
            partstat: 'NEEDS-ACTION',
            preferredEmail: 'user4@test.com'
          }
        ]);
      }
    };

    calEventsProviders = function() {
      return {
        setUpSearchProviders: function() {
        }
      };
    };

    CAL_AUTOCOMPLETE_MAX_RESULTS = 6;

    angular.mock.module('esn.calendar', function($provide) {
      $provide.value('calendarAttendeeService', calendarAttendeeService);
      $provide.value('session', session);
      $provide.factory('calEventsProviders', calEventsProviders);
      $provide.constant('CAL_AUTOCOMPLETE_MAX_RESULTS', CAL_AUTOCOMPLETE_MAX_RESULTS);
    });
    angular.mock.inject(function(_$rootScope_, _$controller_, _calendarAttendeeService_, _session_, _CAL_AUTOCOMPLETE_MAX_RESULTS_) {
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
      $controller = _$controller_;
      calendarAttendeeService = _calendarAttendeeService_;
      session = _session_;
      CAL_AUTOCOMPLETE_MAX_RESULTS = _CAL_AUTOCOMPLETE_MAX_RESULTS_;
    });
  });

  function initController(bindings) {
    return $controller('calAttendeesAutocompleteInputController', null, bindings);
  }

  it('should initialize the model, if none given', function() {
    var ctrl = initController();

    expect(ctrl.mutableAttendees).to.deep.equal([]);
  });

  it('should use the model, if one given', function() {
    var bindings = { mutableAttendees: [{ a: '1' }] };
    var ctrl = initController(bindings);

    expect(ctrl.mutableAttendees).to.deep.equal([{a: '1'}]);
  });

  describe('getInvitableAttendees', function() {
    var query = 'aQuery';
    var ctrl;
    var expectedAtttendeesDuplication = [
      {
        displayName: 'contact3',
        email: 'user3@test.com',
        emails: ['user3@test.com'],
        firstname: 'john',
        id: '333333',
        lastname: 'doe',
        partstat: 'NEEDS-ACTION',
        preferredEmail: 'user3@test.com'
      },
      {
        displayName: 'contact4',
        email: 'user4@test.com',
        emails: ['user4@test.com'],
        id: '444444',
        partstat: 'NEEDS-ACTION',
        preferredEmail: 'user4@test.com'
      }
    ];

    var expectedAttendeesSorted = [
      {
        displayName: 'contact2',
        email: 'user2@test.com',
        emails: ['user2@test.com'],
        id: '222222',
        partstat: 'NEEDS-ACTION',
        preferredEmail: 'user2@test.com'
      },
      {
        displayName: 'contact3',
        email: 'user3@test.com',
        emails: ['user3@test.com'],
        firstname: 'john',
        id: '333333',
        lastname: 'doe',
        partstat: 'NEEDS-ACTION',
        preferredEmail: 'user3@test.com'
      },
      {
        displayName: 'contact4',
        email: 'user4@test.com',
        emails: ['user4@test.com'],
        id: '444444',
        partstat: 'NEEDS-ACTION',
        preferredEmail: 'user4@test.com'
      }
    ];

    beforeEach(function() {
      ctrl = initController();
    });

    it('should call calendarAttendeeService, remove session.user and sort the other users based on the displayName property ', function(done) {
      ctrl.getInvitableAttendees(query).then(function(response) {
        expect(response).to.deep.equal(expectedAttendeesSorted);

        done();
      });

      $scope.$digest();
    });

    it('should remove duplicate attendees, based on primary email, comparing to added already attendees', function(done) {
      ctrl.originalAttendees = [{ email: 'user2@test.com', emails: ['user2@test.com'] }];

      _checkDuplication(done);
    });

    it('should remove duplicate attendees, based on secondary email, comparing to added already attendees', function(done) {
      ctrl.originalAttendees = [{ email: 'another@world.com', emails: ['another@world.com', 'user2@test.com'] }];

      _checkDuplication(done);
    });

    it('should remove duplicate attendees, based on primary email, comparing to attendees being currently added', function(done) {
      ctrl.mutableAttendees = [{ email: 'user2@test.com', emails: ['user2@test.com'] }];

      _checkDuplication(done);
    });

    it('should remove duplicate attendees, based on secondary email, comparing to attendees being currently added', function(done) {
      ctrl.mutableAttendees = [{ email: 'another@world.com', emails: ['another@world.com', 'user2@test.com'] }];

      _checkDuplication(done);
    });

    function _checkDuplication(done) {
      _getAndCheckInvitableAttendees(ctrl, query, expectedAtttendeesDuplication, done);
    }

    function _getAndCheckInvitableAttendees(ctrl, query, expectedAtttendeesDuplication, done) {
      ctrl.getInvitableAttendees(query).then(function(response) {
        expect(response).to.deep.equal(expectedAtttendeesDuplication);

        done();
      });

      $scope.$digest();
    }

    it('should call calendarAttendeeService and return a maximum of CAL_AUTOCOMPLETE_MAX_RESULTS results', function(done) {
      calendarAttendeeService.getAttendeeCandidates = function(q) {
        expect(q).to.equal(query);
        var response = [];

        for (var i = 0; i < 20; i++) {
          response.push({id: 'contact' + i, email: i + 'mail@domain.com', partstat: 'NEEDS-ACTION'});
        }

        return $q.when(response);
      };

      ctrl.getInvitableAttendees(query).then(function(response) {
        expect(response.length).to.equal(CAL_AUTOCOMPLETE_MAX_RESULTS);

        done();
      });

      $scope.$digest();
    });
  });

  describe('onAddingAttendee', function() {
    it('should work with attendee having an email', function() {
      var attendee, response;
      var ctrl = initController();

      attendee = { id: 1, displayName: 'yolo', email: 'yolo@open-paas.org' };
      response = ctrl.onAddingAttendee(attendee);

      expect(response).to.be.true;
    });

    it('should work with attendee without an email', function() {
      var attendee, response;
      var ctrl = initController();

      attendee = {displayName: 'eric cartman'};
      response = ctrl.onAddingAttendee(attendee);

      expect(response).to.be.true;
      expect(attendee.email).to.be.equal('eric cartman');
    });

    describe('adding plain email attendee', function() {
      it('should use displayName as ID and email', function() {
        var displayName = 'plain@email.com';
        var attendee = { displayName: displayName };
        var ctrl = initController();

        ctrl.onAddingAttendee(attendee);
        expect(attendee).to.deep.equal({
          displayName: displayName,
          id: displayName,
          email: displayName
        });
      });

      it('should return false when trying to add duplicate contact as attendee', function() {
        var duplicateContact = {
          id: '1',
          email: 'duplicate@email.com'
        };
        var ctrl = initController();

        ctrl.originalAttendees = [duplicateContact];

        expect(ctrl.onAddingAttendee(duplicateContact)).to.be.false;
      });

      it('should return false when adding contact with existent id as attendee', function() {
        var duplicateContact = {
          id: '1'
        };
        var ctrl = initController();

        ctrl.originalAttendees = [duplicateContact];

        expect(ctrl.onAddingAttendee(duplicateContact)).to.be.false;
      });

      it('should return false when adding contact with existent email as attendee', function() {
        var duplicateContact = {
          email: 'duplicate@email.com'
        };
        var ctrl = initController();

        ctrl.originalAttendees = [duplicateContact];

        expect(ctrl.onAddingAttendee(duplicateContact)).to.be.false;
      });
    });
  });

});
