'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The CalendarsListItemController controller', function() {
  var $controller, $rootScope, $httpBackend, userUtils, CAL_RESOURCE;
  var calendar, displayName, resource;

  beforeEach(function() {
    displayName = 'The user display name';
    userUtils = {
      displayNameOf: sinon.stub()
    };
    resource = {
      name: 'home',
      icon: 'the icon'
    };
    calendar = {
      source: {
        calendarHomeId: '1',
        description: 'The calendar source description'
      },
      getOwner: sinon.stub(),
      isResource: sinon.stub()
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
    it('should set the ctrl.details property when ctrl.showDetails is truely', function() {
      var owner = {_id: 1};
      var controller = initController();

      calendar.isResource.returns(false);
      calendar.getOwner.returns($q.when(owner));
      userUtils.displayNameOf.returns(displayName);
      controller.showDetails = true;
      controller.calendar = calendar;
      controller.$onInit();
      $rootScope.$digest();

      expect(calendar.getOwner).to.have.been.calledOnce;
      expect(userUtils.displayNameOf).to.have.been.calledWith(owner);
      expect(controller.details).to.equal(displayName);
    });

    it('should not set the ctrl.details property when ctrl.showDetails is falsy', function() {
      var controller = initController();

      calendar.getOwner.returns($q.when());
      userUtils.displayNameOf.returns(displayName);
      controller.calendar = calendar;
      controller.$onInit();
      $rootScope.$digest();

      expect(calendar.getOwner).to.not.have.been.called;
      expect(userUtils.displayNameOf).to.not.have.been.called;
      expect(controller.details).to.not.be.defined;
    });

    describe('When calendar is a resource', function() {
      it('should set details from resource name', function() {
        var controller = initController();

        $httpBackend.expectGET('/linagora.esn.resource/api/resources/' + calendar.source.calendarHomeId).respond(resource);

        calendar.isResource.returns(true);
        calendar.getOwner.returns($q.when(resource));
        userUtils.displayNameOf.returns(displayName);
        controller.showDetails = true;
        controller.calendar = calendar;

        controller.$onInit();
        $httpBackend.flush();
        $rootScope.$digest();

        expect(calendar.getOwner).to.have.been.calledWith;
        expect(userUtils.displayNameOf).to.not.have.been.called;
        expect(controller.details).to.equal(resource.name);
      });
    });

    it('should set calendar resource icon when calendar of a resource with an icon', function() {
      var controller = initController();

      calendar.isResource.returns(true);
      $httpBackend.expectGET('/linagora.esn.resource/api/resources/' + calendar.source.calendarHomeId).respond(resource);
      controller.calendar = calendar;

      controller.$onInit();
      $httpBackend.flush();
      $rootScope.$digest();

      expect(controller.resourceIcon).to.be.equal(CAL_RESOURCE.ICONS[resource.icon]);
    });

    it('should set default calendar resource icon when calendar of a resource without icon', function() {
      var controller = initController();

      delete resource.icon;

      calendar.isResource.returns(true);
      $httpBackend.expectGET('/linagora.esn.resource/api/resources/' + calendar.source.calendarHomeId).respond(resource);
      controller.calendar = calendar;

      controller.$onInit();
      $httpBackend.flush();
      $rootScope.$digest();

      expect(controller.resourceIcon).to.be.equal(CAL_RESOURCE.DEFAULT_ICON);
    });
  });
});
