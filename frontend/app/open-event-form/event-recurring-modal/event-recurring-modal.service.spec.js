'use strict';

/* global chai: false */
/* global sinon: false */

var expect = chai.expect;

describe('The eventRecurringModalService service', function() {
  var $modal, $rootScope;
  var calendar, calendarHomeId, eventRecurringModalService, action, hide, templateUrl;

  beforeEach(function() {
    calendarHomeId = '123';
    calendar = {id: 1, calendarHomeId: calendarHomeId};
    $modal = sinon.spy();
    action = sinon.spy();
    hide = sinon.spy();

    angular.mock.module('linagora.esn.graceperiod', 'esn.calendar');
    angular.mock.module(function($provide) {
      $provide.value('$modal', $modal);
    });
  });

  beforeEach(angular.mock.inject(function(_$rootScope_, _eventRecurringModalService_) {
    $rootScope = _$rootScope_;
    eventRecurringModalService = _eventRecurringModalService_;
    templateUrl = '/calendar/app/open-event-form/event-recurring-modal/edit-instance-or-series.html';
  }));

  describe('openRecurringModal function', function() {
    it('should open $modal when calling openRecurringModal with calendar, templaterUrl and action ', function() {
      eventRecurringModalService.openRecurringModal(calendar, templateUrl, action);
      $rootScope.$digest();

      expect($modal).to.have.been.calledWith(sinon.match({
        templateUrl: '/calendar/app/open-event-form/event-recurring-modal/edit-instance-or-series.html'
      }));
    });

    it('should call action with action with an argument set to true when working on an instance', function(done) {
      eventRecurringModalService.openRecurringModal(calendar, templateUrl, action);
      $rootScope.$digest();

      expect($modal).to.have.been.calledWith(sinon.match({
        templateUrl: '/calendar/app/open-event-form/event-recurring-modal/edit-instance-or-series.html',
        controller: sinon.match.func.and(sinon.match(function(controller) {
          var $scope = {
            calendarHomeId: null,
            $hide: hide,
            applyOnInstance: sinon.spy()
          };

          controller($scope);
          $scope.applyOnInstance();
          $rootScope.$digest();

          expect($scope.calendarHomeId).to.equal('123');
          expect(hide).to.have.been.called;
          expect(action).to.have.been.calledWith(true);

          done();
          return true;
        }))
      }));
    });

    it('should call action with action without argument when working on an all instances', function(done) {
      eventRecurringModalService.openRecurringModal(calendar, templateUrl, action);
      $rootScope.$digest();

      expect($modal).to.have.been.calledWith(sinon.match({
        templateUrl: '/calendar/app/open-event-form/event-recurring-modal/edit-instance-or-series.html',
        controller: sinon.match.func.and(sinon.match(function(controller) {
          var $scope = {
            calendarHomeId: null,
            $hide: hide,
            applyOnAllInstances: sinon.spy()
          };

          controller($scope);
          $scope.applyOnAllInstances();
          $rootScope.$digest();

          expect($scope.calendarHomeId).to.equal('123');
          expect(hide).to.have.been.called;
          expect(action).to.have.been.calledWith();

          done();
          return true;
        }))
      }));
    });

    it('should not open $modal when calling openRecurringModal with wrong arguments ', function() {
      eventRecurringModalService.openRecurringModal();
      eventRecurringModalService.openRecurringModal(calendar);
      eventRecurringModalService.openRecurringModal(calendar, templateUrl);
      $rootScope.$digest();

      expect($modal).to.have.not.been.called;
    });
  });
});
