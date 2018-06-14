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
    this.context.organizer = { email: 'organizer@openpaas.org' };

    this.initController = function() {
      return this.$controller('CalAttendeeListController', {$scope: this.$scope}, this.context);
    };
  }));

  describe('The $onInit function', function() {
    it('should set organizerAttendee from attendees', function() {
      this.context.attendees.push(this.context.organizer);
      var ctrl = this.initController();

      ctrl.$onInit();

      expect(ctrl.organizerAttendee).to.deep.equal(this.context.organizer);
    });

    it('should set attendeesToDisplay which does not contains oragnizer', function() {
      this.context.attendees.push(this.context.organizer);
      var ctrl = this.initController();

      ctrl.$onInit();

      expect(ctrl.attendeesToDisplay).to.deep.equal([
        { email: 'other1@example.com', partstat: 'NEEDS-ACTION' },
        { email: 'other2@example.com', partstat: 'ACCEPTED' },
        { email: 'other3@example.com', partstat: 'DECLINED' },
        { email: 'other4@example.com', partstat: 'TENTATIVE' },
        { email: 'other5@example.com', partstat: 'YOLO' }
      ]);
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
