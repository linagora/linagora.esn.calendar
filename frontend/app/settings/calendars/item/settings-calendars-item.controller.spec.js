'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The CalSettingsCalendarsItemController controller', function() {
  var $rootScope, $controller, $scope, calUIAuthorizationService, calendar, session;

  beforeEach(function() {
    calUIAuthorizationService = {};
    calendar = {id: 1};
    session = {
      ready: {
        then: angular.noop
      },
      user: {
        id: 1
      }
    };
  });

  beforeEach(function() {
    angular.mock.module('esn.calendar', function($provide) {
      $provide.value('calUIAuthorizationService', calUIAuthorizationService);
    });
  });

  beforeEach(function() {
    angular.mock.inject(function(_$rootScope_, _$controller_) {
      $rootScope = _$rootScope_;
      $controller = _$controller_;
      $scope = $rootScope.$new();
    });
  });

  function initController(bindings) {
    return $controller('CalSettingsCalendarsItemController', { $scope: $scope }, bindings);
  }

  describe('The canDeleteCalendar function', function() {
    it('should call calUIAuthorizationService.canDeleteCalendar correctly', function() {
      calUIAuthorizationService.canDeleteCalendar = sinon.spy();

      var controller = initController({calendar: calendar});

      controller.canDeleteCalendar();

      expect(calUIAuthorizationService.canDeleteCalendar).to.have.been.calledWith(calendar, session.user._id);
    });
  });

  describe('The remove function', function() {
    it('should call the  onRemove function with the current calendar', function() {
      var onRemove = sinon.spy();
      var controller = initController({onRemove: onRemove, calendar: calendar});

      controller.remove();

      expect(onRemove).to.have.been.calledWith(calendar);
    });
  });
});
