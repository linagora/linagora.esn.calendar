'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The CalAttendeeListController controller', function() {

  beforeEach(function() {
    module('jadeTemplates');
    angular.mock.module('esn.calendar');
  });

  beforeEach(angular.mock.inject(function($controller, $rootScope, $compile, CAL_EVENTS) {
    this.$controller = $controller;
    this.$rootScope = $rootScope;
    this.$scope = this.$rootScope.$new();
    this.$compile = $compile;
    this.CAL_EVENTS = CAL_EVENTS;
    this.context = {};
    this.context.attendees = [
      { email: 'other1@example.com', partstat: 'NEEDS-ACTION' },
      { email: 'other2@example.com', partstat: 'ACCEPTED' },
      { email: 'other3@example.com', partstat: 'DECLINED' },
      { email: 'other4@example.com', partstat: 'TENTATIVE' },
      { email: 'other5@example.com', partstat: 'YOLO' }
    ];

    this.initController = function() {
      return this.$controller('CalAttendeeListController', {$scope: this.$scope}, this.context);
    };
  }));

  describe('The $onInit function', function() {
    it('should set organizer flag to organizer', function() {
      this.context.organizer = { email: this.context.attendees[1].email };

      var ctrl = this.initController();

      ctrl.$onInit();

      expect(ctrl.attendees[1].organizer).to.be.true;
    });
  });

  describe('The removeAttendee function', function() {
    it('should call onAttendeeRemoved with removed attendee', function() {
      var ctrl = this.initController();

      ctrl.onAttendeeRemoved = sinon.spy();
      ctrl.$onInit();
      ctrl.removeAttendee(this.context.attendees[0]);

      expect(ctrl.onAttendeeRemoved).to.have.been.calledWith({ attendee: this.context.attendees[0] });
    });
  });
});
