'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The CalSettingsCalendarsItemController controller', function() {
  var $rootScope, $controller, $scope;

  beforeEach(function() {
    angular.mock.module('esn.calendar');
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

  describe('The remove function', function() {
    it('should call the  onRemove function with the current calendar', function() {
      var onRemove = sinon.spy();
      var calendar = {id: 1};
      var controller = initController({onRemove: onRemove, calendar: calendar});

      controller.remove();

      expect(onRemove).to.have.been.calledWith(calendar);
    });
  });
});
