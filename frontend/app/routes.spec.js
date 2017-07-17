'use strict';

/* global chai: false */
/* global sinon: false */

var expect = chai.expect;

describe('The esn.calendar routes', function() {
  var $state, $q, $injector;
  var calEventServiceMock, calEventUtilsMock, notificationFactoryMock;
  var returnResults;

  function invokeStateController(state, view, args) {
    var stateOrViewDefinition = view ? $state.get(state).views[view] : $state.get(state);
    var controller = stateOrViewDefinition.controller;

    return $injector.invoke(controller, null, args);
  }

  beforeEach(function() {
    returnResults = {
      event: {},
      editedEvent: {},
      error: {}
    };

    notificationFactoryMock = {
      weakInfo: sinon.spy(),
      weakError: sinon.spy()
    };

    calEventUtilsMock = {
      getEditedEvent: sinon.spy(function() {
        return returnResults.editedEvent;
      })
    };

    calEventServiceMock = {
      getEvent: sinon.spy(function() {
        return $q.when(returnResults.event);
      })
    };

    angular.mock.module('esn.calendar', function($provide) {
      $provide.value('notificationFactory', notificationFactoryMock);
      $provide.value('calEventUtils', calEventUtilsMock);
      $provide.value('calEventService', calEventServiceMock);
    });
  });

  beforeEach(function() {
    angular.mock.inject(function(_$state_, _$q_, _$injector_) {
      $state = _$state_;
      $q = _$q_;
      $injector = _$injector_;
    });
  });

  describe('The calendar.event.consult state', function() {
    it('should expose the resolved event to the scope', function() {
      var scope = {};
      var event = 'event';

      invokeStateController('calendar.event.consult', 'content', {
          $scope: scope,
          event: event
        }
      );

      expect(scope.event).to.equal(event);
    });
  });
});
