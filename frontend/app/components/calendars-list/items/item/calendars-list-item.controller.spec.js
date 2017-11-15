'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The CalendarsListItemController controller', function() {
  var $controller, $rootScope, $httpBackend, userUtils, CAL_RESOURCE;
  var calendar, isResource;

  beforeEach(function() {
    userUtils = {
      displayNameOf: sinon.spy()
    };
    calendar = {
      getOwner: sinon.spy(),
      isResource: sinon.spy(function() {
        return isResource;
      })
    };

    angular.mock.module('linagora.esn.resource');
    angular.mock.module('esn.calendar');

    angular.mock.module(function($provide) {
      $provide.value('userUtils', userUtils);
    });

    angular.mock.inject(function(_$controller_, _$rootScope_, _$httpBackend_, _CAL_RESOURCE_) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      $httpBackend = _$httpBackend_;
      CAL_RESOURCE = _CAL_RESOURCE_;
    });
  });

  function initController() {
    return $controller('CalendarsListItemController');
  }

  describe('The $onInit function', function() {
    it('should set the ctrl.ownerDisplayName property when ctrl.showDetails is truely', function() {
      var displayName = 'The user display name';
      var owner = {_id: 1};
      var controller = initController();
      isResource = false;

      calendar.getOwner = sinon.spy(function() {
        return $q.when(owner);
      });
      userUtils.displayNameOf = sinon.spy(function() {
        return displayName;
      });

      controller.showDetails = true;
      controller.calendar = calendar;
      controller.$onInit();
      $rootScope.$digest();

      expect(calendar.getOwner).to.have.been.calledOnce;
      expect(userUtils.displayNameOf).to.have.been.calledWith(owner);
      expect(controller.ownerDisplayName).to.equal(displayName);
    });

    it('should not set the ctrl.ownerDisplayName property when ctrl.showDetails is falsy', function() {
      var displayName = 'The user display name';
      var controller = initController();
      isResource = false;

      calendar.getOwner = sinon.spy(function() {
        return $q.when();
      });
      userUtils.displayNameOf = sinon.spy(function() {
        return displayName;
      });

      controller.calendar = calendar;
      controller.$onInit();
      $rootScope.$digest();

      expect(calendar.getOwner).to.not.have.been.called;
      expect(userUtils.displayNameOf).to.not.have.been.called;
      expect(controller.ownerDisplayName).to.not.be.defined;
    });

    it('should set calendar resource icon when calendar of a resource with an icon', function() {
      var resource = {
        name: 'home',
        icon: 'home'
      };
      var id = '1';
      var controller = initController();
      isResource = true;

      $httpBackend.expectGET('/linagora.esn.resource/api/resources/' + id).respond(resource);

      calendar.source = {
        calendarHomeId: id
      };
      controller.calendar = calendar;

      controller.$onInit();

      $httpBackend.flush();
      $rootScope.$digest();

      expect(controller.resourceIcon).to.be.equal(CAL_RESOURCE.ICONS[resource.icon]);
    });

    it('should set default calendar resource icon when calendar of a resource without icon', function() {
      var resource = {
        name: 'home'
      };
      var id = '1';
      var controller = initController();
      isResource = true;

      $httpBackend.expectGET('/linagora.esn.resource/api/resources/' + id).respond(resource);

      calendar.source = {
        calendarHomeId: id
      };
      controller.calendar = calendar;

      controller.$onInit();

      $httpBackend.flush();
      $rootScope.$digest();

      expect(controller.resourceIcon).to.be.equal(CAL_RESOURCE.DEFAULT_ICON);
    });
  });
});
