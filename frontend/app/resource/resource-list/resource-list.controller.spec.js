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
      { name: 'Resource 1', selected: false },
      { name: 'Resource 2', selected: true },
      { name: 'Resource 3', selected: false },
      { name: 'Resource 4', selected: true },
      { name: 'Resource 5' }
    ];
    this.context.deleteResources = sinon.spy();

    this.initController = function() {
      return this.$controller('CalResourceListController', {$scope: this.$scope}, this.context);
    };
  }));

  describe('The deleteSelectedResource function', function() {
    it('should filter unselected resources', function() {
      var ctrl = this.initController();

      ctrl.deleteSelectedResources();

      expect(ctrl.resources).to.deep.equal([
        { name: 'Resource 1', selected: false },
        { name: 'Resource 3', selected: false },
        { name: 'Resource 5' }
      ]);
      expect(ctrl.resourceSelectedCount).to.be.equal(0);
    });

    it('should calll onResourcesRemoved with removed resources', function() {
      var ctrl = this.initController();

      ctrl.onResourcesRemoved = sinon.spy();
      ctrl.deleteSelectedResources();

      expect(ctrl.onResourcesRemoved).to.have.been.calledWith({removed: [
        { name: 'Resource 2', selected: true },
        { name: 'Resource 4', selected: true }
      ]});
    });
  });

  describe('The selectResource function', function() {
    it('should set selected and increase resource click count', function() {
      var resource = { name: 'Resource 1' };
      var ctrl = this.initController();

      ctrl.selectResource(resource);

      expect(resource.selected).to.be.true;
      expect(ctrl.resourceSelectedCount).to.equal(1);
    });

    it('should unset selected and decrease resource click count', function() {
      var resource = { name: 'Resource 1' };
      var ctrl = this.initController();

      ctrl.selectResource(resource);
      ctrl.selectResource(resource);

      expect(resource.selected).to.be.false;
      expect(ctrl.resourceSelectedCount).to.equal(0);
    });
  });
});
