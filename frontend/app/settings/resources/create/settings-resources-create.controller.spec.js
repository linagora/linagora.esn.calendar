'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The CalSettingsResourcesCreateController controller', function() {
  var $q, $state, $controller, $rootScope, $scope, context, resource, esnResourceAPIClient, sessionMock, asyncAction, CAL_RESOURCE;

  beforeEach(function() {
    module('jadeTemplates');
    angular.mock.module('esn.calendar');
  });

  beforeEach(function() {
    resource = {name: 'Foo', description: 'bar'};
    asyncAction = sinon.spy();
    esnResourceAPIClient = {};
    context = {
      resource: resource
    };

    sessionMock = {
      ready: {
        then: angular.noop
      },
      user: {
        _id: 3
      }
    };

    module(function($provide) {
      $provide.value('asyncAction', asyncAction);
      $provide.value('esnResourceAPIClient', esnResourceAPIClient);
      $provide.value('session', sessionMock);
    });
  });

  beforeEach(angular.mock.inject(function(_$state_, _$controller_, _$rootScope_, _$q_, _CAL_RESOURCE_, _esnResourceAPIClient_) {
    $state = _$state_;
    $controller = _$controller_;
    $rootScope = _$rootScope_;
    $q = _$q_;
    CAL_RESOURCE = _CAL_RESOURCE_;
    esnResourceAPIClient = _esnResourceAPIClient_;
    $scope = $rootScope.$new();
  }));

  function initController() {
    return $controller('CalSettingsResourcesCreateController', {$scope: $scope}, context);
  }

  describe('The submit function', function() {
    var ctrl;

    beforeEach(function() {
      ctrl = initController();
    });

    it('should call the resourceAPIClient.create correctly and reload the resources', function() {
      esnResourceAPIClient.create = sinon.stub().returns($q.when());
      var goSpy = sinon.spy($state, 'go');

      ctrl.beAdmin = false;
      ctrl.submit();
      asyncAction.firstCall.args[1]();
      $rootScope.$digest();

      expect(esnResourceAPIClient.create).to.have.been.calledWith({
        type: CAL_RESOURCE.type,
        name: resource.name,
        description: resource.description,
        administrators: []
      });

      expect(goSpy).to.have.been.calledWith('calendar.settings.resources', sinon.match.any, { reload: true });
    });

    it('should add the administrators ', function() {
      esnResourceAPIClient.create = sinon.stub().returns($q.when());
      var goSpy = sinon.spy($state, 'go');

      ctrl.resourceAdministrators = [
        {
          _id: 1
        }
      ];

      ctrl.beAdmin = false;
      ctrl.submit();
      asyncAction.firstCall.args[1]();
      $rootScope.$digest();

      expect(esnResourceAPIClient.create).to.have.been.calledWith({
        type: CAL_RESOURCE.type,
        name: resource.name,
        description: resource.description,
        administrators: [
          {
            id: 1,
            objectType: 'user'
          }
        ]
      });

      expect(goSpy).to.have.been.calledWith('calendar.settings.resources', sinon.match.any, { reload: true });
    });

    it('should add the creator in administrators field if the checkbox is checked', function() {
      esnResourceAPIClient.create = sinon.stub().returns($q.when());
      var goSpy = sinon.spy($state, 'go');

      ctrl.beAdmin = true;
      ctrl.submit();
      asyncAction.firstCall.args[1]();
      $rootScope.$digest();

      expect(esnResourceAPIClient.create).to.have.been.calledWith({
        type: CAL_RESOURCE.type,
        name: resource.name,
        description: resource.description,
        administrators: [
          {
            id: 3,
            objectType: 'user'
          }
        ]
      });

      expect(goSpy).to.have.been.calledWith('calendar.settings.resources', sinon.match.any, { reload: true });
    });

    it('should not add the creator in administrators field if the checkbox is not checked', function() {
      esnResourceAPIClient.create = sinon.stub().returns($q.when());
      var goSpy = sinon.spy($state, 'go');

      ctrl.beAdmin = false;
      ctrl.submit();
      asyncAction.firstCall.args[1]();
      $rootScope.$digest();

      expect(esnResourceAPIClient.create).to.have.been.calledWith({
        type: CAL_RESOURCE.type,
        name: resource.name,
        description: resource.description,
        administrators: []
      });

      expect(goSpy).to.have.been.calledWith('calendar.settings.resources', sinon.match.any, { reload: true });
    });

  });
});
