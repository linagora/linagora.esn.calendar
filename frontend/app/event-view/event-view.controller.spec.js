(function() {
  'use strict';

  /* global chai, sinon: false */

  var expect = chai.expect;

  describe('The CalEventViewController controller', function() {
    var $controller, $scope, calAttendeeService, bindings, userAttendee, resourceAttendee, CAL_ICAL;

    beforeEach(function() {
      angular.mock.module('esn.calendar');
      angular.mock.inject(function($rootScope, _$controller_, _calAttendeeService_, _CAL_ICAL_) {
        $controller = _$controller_;
        $scope = $rootScope.$new();
        calAttendeeService = _calAttendeeService_;
        CAL_ICAL = _CAL_ICAL_;
      });

      userAttendee = { _id: 1, cutype: CAL_ICAL.cutype.individual };
      resourceAttendee = { _id: 1, cutype: CAL_ICAL.cutype.resource };

      bindings = {
        event: {
          attendees: [userAttendee, resourceAttendee]
        }
      };
    });

    function initController() {
      return $controller('CalEventViewController', { $scope: $scope }, bindings);
    }

    it('The $onInit function', function() {
      var ctrl = initController();

      sinon.spy(calAttendeeService, 'splitAttendeesFromType');
      ctrl.$onInit();
      $scope.$digest();

      expect(calAttendeeService.splitAttendeesFromType).has.been.calledWith(bindings.event.attendees);
      expect(ctrl.attendees).to.deep.equals({
        users: [userAttendee],
        resources: [resourceAttendee]
      });
    });
  });
})();
