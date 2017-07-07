'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The CalSettingsCalendarsItemController controller', function() {
  var $rootScope, $controller, $scope, $q, calUIAuthorizationService, calendar, session, userUtils, owner;

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
    userUtils = {};
    owner = {id: 2};
  });

  beforeEach(function() {
    angular.mock.module('esn.calendar', function($provide) {
      $provide.value('calUIAuthorizationService', calUIAuthorizationService);
      $provide.value('userUtils', userUtils);
    });
  });

  beforeEach(function() {
    angular.mock.inject(function(_$rootScope_, _$controller_, _$q_) {
      $rootScope = _$rootScope_;
      $controller = _$controller_;
      $q = _$q_;
      $scope = $rootScope.$new();
    });
  });

  function initController(bindings) {
    return $controller('CalSettingsCalendarsItemController', { $scope: $scope }, bindings);
  }

  describe('The $onInit function', function() {
    it('should not set owerDisplayName is displayOwer is falsy', function() {
      userUtils.displayNameOf = sinon.spy();
      calendar.getOwner = sinon.spy();

      var controller = initController({calendar: calendar});

      controller.$onInit();
      $rootScope.$digest();

      expect(calendar.getOwner).to.not.have.been.called;
      expect(userUtils.displayNameOf).to.not.have.been.called;
    });

    it('should set owerDisplayName is displayOwer is truthy', function() {
      userUtils.displayNameOf = sinon.spy();
      calendar.getOwner = sinon.spy(function() {
        return $q.when(owner);
      });

      var controller = initController({calendar: calendar, displayOwner: true});

      controller.$onInit();
      $rootScope.$digest();

      expect(calendar.getOwner).to.have.been.called;
      expect(userUtils.displayNameOf).to.have.been.calledWith();
    });
  });

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
