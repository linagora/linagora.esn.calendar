'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The CalAttendeeAvatarController controller', function() {
  var esnAvatarUrlService, $controller, $rootScope, $scope, context, attendee, CAL_ICAL, CAL_RESOURCE;

  beforeEach(function() {
    module('jadeTemplates');
    angular.mock.module('esn.calendar');
  });

  beforeEach(function() {
    esnAvatarUrlService = {};
    attendee = { email: 'other1@example.com', partstat: 'NEEDS-ACTION' };
    context = {
      attendee: attendee
    };

    module(function($provide) {
      $provide.value('esnAvatarUrlService', esnAvatarUrlService);
    });
  });

  beforeEach(angular.mock.inject(function(_$controller_, _$rootScope_, _CAL_ICAL_, _CAL_RESOURCE_) {
    $controller = _$controller_;
    $rootScope = _$rootScope_;
    CAL_ICAL = _CAL_ICAL_;
    CAL_RESOURCE = _CAL_RESOURCE_;
    $scope = $rootScope.$new();
  }));

  function initController() {
    return $controller('CalAttendeeAvatarController', {$scope: $scope}, context);
  }

  describe('The $onChanges function', function() {
    var ctrl, avatarUrl;

    beforeEach(function() {
      avatarUrl = '/foo/bar/baz.png';

      esnAvatarUrlService.generateUrlByUserEmail = sinon.stub().returns(avatarUrl);
      ctrl = initController();
    });

    it('should set the controller avatarUrl from esnAvatarUrlService service', function() {
      ctrl.$onChanges();

      expect(ctrl.avatarUrl).to.equal(avatarUrl);
      expect(esnAvatarUrlService.generateUrlByUserEmail).to.have.been.calledWith(attendee.email);
    });

    it('should return the displayName', function() {
      attendee.displayName = 'toto';
      ctrl.$onChanges();

      expect(ctrl.getDisplayName()).to.be.equal(attendee.displayName);
    });
  });
});
