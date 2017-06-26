'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The CalAttendeeAvatarController controller', function() {

  var esnAvatarUrlService, $controller, $rootScope, $scope, context, attendee;

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

  beforeEach(angular.mock.inject(function(_$controller_, _$rootScope_) {
    $controller = _$controller_;
    $rootScope = _$rootScope_;
    $scope = $rootScope.$new();
  }));

  function initController() {
    return $controller('CalAttendeeAvatarController', {$scope: $scope}, context);
  }

  describe('The $onInit function', function() {
    var ctrl;

    beforeEach(function() {
      ctrl = initController();
    });

    it('should set the controller avatarUrl from esnAvatarUrlService service', function() {
      var result = 'The Avatar URL result';

      esnAvatarUrlService.generateUrlByUserEmail = sinon.spy(function() {
        return result;
      });
      ctrl.$onInit();

      expect(ctrl.avatarUrl).to.equal(result);
      expect(esnAvatarUrlService.generateUrlByUserEmail).to.have.been.calledWith(attendee.email);
    });
  });
});
