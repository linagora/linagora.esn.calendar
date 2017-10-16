'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The CalResourceListController controller', function() {

  beforeEach(function() {
    module('jadeTemplates');
    angular.mock.module('esn.calendar');
  });

  beforeEach(angular.mock.inject(function($controller, $rootScope, CAL_EVENTS, CAL_ICAL) {
    this.$controller = $controller;
    this.$rootScope = $rootScope;
    this.$scope = this.$rootScope.$new();
    this.CAL_EVENTS = CAL_EVENTS;
    this.CAL_ICAL = CAL_ICAL;
    this.context = {};
    this.context.resources = [
      { name: 'Resource 1', clicked: false },
      { name: 'Resource 2', clicked: true },
      { name: 'Resource 3', clicked: false },
      { name: 'Resource 4', clicked: true },
      { name: 'Resource 5' }
    ];
    this.context.deleteResources = sinon.spy();

    this.initController = function() {
      return this.$controller('CalResourceListController', {$scope: this.$scope}, this.context);
    };
  }));

  describe('The deleteSelectedResource function', function() {
    it('should filter unclicked resources', function() {
      var ctrl = this.initController();

      ctrl.deleteSelectedResources();

      expect(ctrl.resources).to.deep.equal([
        { name: 'Resource 1', clicked: false },
        { name: 'Resource 3', clicked: false },
        { name: 'Resource 5' }
      ]);
      expect(ctrl.resourceClickedCount).to.be.equal(0);
    });
  });

  describe('The selectResource function', function() {
    it('should set clicked and increase resource click count', function() {
      var resource = { name: 'Resource 1' };
      var ctrl = this.initController();

      ctrl.selectResource(resource);

      expect(resource.clicked).to.be.true;
      expect(ctrl.resourceClickedCount).to.equal(1);
    });

    it('should unset clicked and decrease resource click count', function() {
      var resource = { name: 'Resource 1' };
      var ctrl = this.initController();

      ctrl.selectResource(resource);
      ctrl.selectResource(resource);

      expect(resource.clicked).to.be.false;
      expect(ctrl.resourceClickedCount).to.equal(0);
    });
  });
});
