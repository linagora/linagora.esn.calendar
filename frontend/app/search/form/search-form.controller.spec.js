(function() {
  'use strict';

  /* global chai, sinon: false */

  var expect = chai.expect;

  describe('The EventSearchFormController', function() {
    var $controller,
      $scope,
      calendarService,
      userAndExternalCalendars,
      session,
      CAL_ADVANCED_SEARCH_CALENDAR_TYPES,
      userCalendars,
      publicCalendars,
      sharedCalendars,
      fullQuery;

    userCalendars = [{ _id: 'userId1' }, { _id: 'calId1'}];
    publicCalendars = [{ _id: 'calId2' }];
    sharedCalendars = [{ _id: 'calId3' }];
    fullQuery = {
      text: 'king',
      advanced: {
        organizers: [{ _id: 'userId1' }],
        attendees: [{ _id: 'userId1' }]
      }
    };

    beforeEach(function() {
      session = {
        user: {
          _id: '123456'
        },
        ready: {
          then: angular.noop
        }
      };

      userAndExternalCalendars = sinon.stub().returns({
        userCalendars: userCalendars,
        publicCalendars: publicCalendars,
        sharedCalendars: sharedCalendars
      });

      module('esn.calendar');

      module(function($provide) {
        $provide.value('session', session);
        $provide.value('userAndExternalCalendars', userAndExternalCalendars);
      });

      inject(function($rootScope, _$controller_, _session_, _calendarService_, _userAndExternalCalendars_, _CAL_ADVANCED_SEARCH_CALENDAR_TYPES_) {
        $controller = _$controller_;
        calendarService = _calendarService_;
        $scope = $rootScope.$new();
        session = _session_;
        userAndExternalCalendars = _userAndExternalCalendars_;
        CAL_ADVANCED_SEARCH_CALENDAR_TYPES = _CAL_ADVANCED_SEARCH_CALENDAR_TYPES_;

        calendarService.listPersonalAndAcceptedDelegationCalendars = sinon.stub().returns(
          $q.when(userCalendars.concat(publicCalendars, sharedCalendars))
        );
      });
    });

    function initController(bindings) {
      return $controller('EventSearchFormController', { $scope: $scope }, bindings);
    }

    describe('The $onInit function', function() {
      it('should initialize advanced query correctly with default options', function() {
        var bindings = {
          query: {}
        };

        var ctrl = initController(bindings);

        ctrl.$onInit();

        $scope.$digest();

        expect(ctrl.query.advanced).to.deep.equal({
          organizers: [],
          attendees: [],
          contains: '',
          cal: CAL_ADVANCED_SEARCH_CALENDAR_TYPES.ALL_CALENDARS
        });
      });

      it('should initialize advanced query correctly with existing advanced query options', function() {
        fullQuery.advanced.cal = CAL_ADVANCED_SEARCH_CALENDAR_TYPES.MY_CALENDARS;

        var bindings = {
          query: fullQuery
        };

        var ctrl = initController(bindings);

        ctrl.$onInit();

        $scope.$digest();

        expect(ctrl.query.advanced).to.deep.equal({
          organizers: fullQuery.advanced.organizers,
          attendees: fullQuery.advanced.attendees,
          contains: fullQuery.text,
          cal: fullQuery.advanced.cal
        });
      });

      it('should call #calendarService.listPersonalAndAcceptedDelegationCalendars with a good param and set ctrl.calendars correctly', function() {
        fullQuery.advanced.cal = CAL_ADVANCED_SEARCH_CALENDAR_TYPES.ALL_CALENDARS;

        var bindings = {
          query: fullQuery
        };

        var ctrl = initController(bindings);

        ctrl.$onInit();

        $scope.$digest();

        expect(calendarService.listPersonalAndAcceptedDelegationCalendars).to.have.been.calledOnce;
        expect(calendarService.listPersonalAndAcceptedDelegationCalendars).to.have.been.calledWith(session.user._id);
        expect(ctrl.calendars).to.deep.equal({
          myCalendars: userCalendars,
          sharedCalendars: publicCalendars.concat(sharedCalendars)
        });
      });
    });
  });
})();
