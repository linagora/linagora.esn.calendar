'use strict';

/* global chai: false, sinon: false */

var expect = chai.expect;

describe('The calInboxResourceManagementBlueBarController', function() {
  var esnResourceAPIClient, notifySpy, notificationFactory, calResourceService, resource, eventPath, headers, event, calEventService, $controller, $rootScope, $scope, context, $q, X_OPENPAAS_CAL_HEADERS;

  beforeEach(function() {
    module('jadeTemplates');
    angular.mock.module('esn.calendar');
  });

  beforeEach(function() {
    event = {
      calendarHomeId: 'HomeId'
    };
    resource = {_id: 1};
    context = {};
    esnResourceAPIClient = {
      get: sinon.stub()
    };
    calEventService = {
      getEvent: sinon.stub()
    };
    calResourceService = {
      acceptResourceReservation: sinon.stub(),
      declineResourceReservation: sinon.stub()
    };
    eventPath = '/foo/bar.ics';

    module(function($provide) {
      $provide.value('esnResourceAPIClient', esnResourceAPIClient);
      $provide.value('calEventService', calEventService);
      $provide.value('calResourceService', calResourceService);
    });
  });

  beforeEach(angular.mock.inject(function(_$q_, _$controller_, _$rootScope_, _notificationFactory_, _X_OPENPAAS_CAL_HEADERS_) {
    $q = _$q_;
    $controller = _$controller_;
    $rootScope = _$rootScope_;
    notificationFactory = _notificationFactory_;
    $scope = $rootScope.$new();
    X_OPENPAAS_CAL_HEADERS = _X_OPENPAAS_CAL_HEADERS_;
  }));

  beforeEach(function() {
    headers = {};
    headers[X_OPENPAAS_CAL_HEADERS.EVENT_PATH] = eventPath;
    context.message = {
      headers: headers
    };

    notifySpy = sinon.spy(notificationFactory, 'weakInfo');
  });

  function initController() {
    return $controller('calInboxResourceManagementBlueBarController', {$scope: $scope}, context);
  }

  describe('The $onInit function', function() {
    it('should get the event from the email header path', function() {
      calEventService.getEvent.returns($q.when(event));
      esnResourceAPIClient.get.returns($q.when({data: resource}));

      var controller = initController();

      controller.$onInit();

      $rootScope.$digest();

      expect(controller.meeting.eventPath).to.equal(eventPath);
      expect(calEventService.getEvent).to.have.been.calledWith(eventPath);
      expect(esnResourceAPIClient.get).to.have.been.calledWith(event.calendarHomeId);
      expect(controller.event).to.equal(event);
      expect(controller.resource).to.equal(resource);
    });

    it('should set invalid when event does not exists', function() {
      var error = {
        status: 404
      };

      calEventService.getEvent.returns($q.reject(error));
      esnResourceAPIClient.get.returns($q.when({data: resource}));

      var controller = initController();

      controller.$onInit();

      $rootScope.$digest();

      expect(controller.meeting.eventPath).to.equal(eventPath);
      expect(calEventService.getEvent).to.have.been.calledWith(eventPath);
      expect(esnResourceAPIClient.get).to.not.have.been.called;
      expect(controller.event).to.not.be.defined;
      expect(controller.resource).to.not.be.defined;
      expect(controller.meeting.invalid).to.be.true;
      expect(controller.meeting.error).to.not.be.defined;
      expect(controller.meeting.loaded).to.be.true;
    });

    it('should set error when getEvent fails with error', function() {
      var error = new Error('I failed');

      calEventService.getEvent.returns($q.reject(error));
      esnResourceAPIClient.get.returns($q.when({data: resource}));

      var controller = initController();

      controller.$onInit();

      $rootScope.$digest();

      expect(controller.meeting.eventPath).to.equal(eventPath);
      expect(calEventService.getEvent).to.have.been.calledWith(eventPath);
      expect(esnResourceAPIClient.get).to.not.have.been.called;
      expect(controller.event).to.not.be.defined;
      expect(controller.resource).to.not.be.defined;
      expect(controller.meeting.invalid).to.not.be.defined;
      expect(controller.meeting.error).to.equal(error.message);
      expect(controller.meeting.loaded).to.be.true;
    });

    it('should set error when esnResourceAPIClient.get fails', function() {
      var error = new Error('I failed');

      calEventService.getEvent.returns($q.when(event));
      esnResourceAPIClient.get.returns($q.reject(error));

      var controller = initController();

      controller.$onInit();

      $rootScope.$digest();

      expect(controller.meeting.eventPath).to.equal(eventPath);
      expect(calEventService.getEvent).to.have.been.calledWith(eventPath);
      expect(esnResourceAPIClient.get).to.have.been.called;
      expect(controller.event).to.equal(event);
      expect(controller.resource).to.not.be.defined;
      expect(controller.meeting.invalid).to.not.be.defined;
      expect(controller.meeting.error).to.equal(error.message);
      expect(controller.meeting.loaded).to.be.true;
    });

  });

  describe('The acceptResourceReservation function', function() {
    var resource, event;

    beforeEach(function() {
      resource = {_id: 1};
      event = {id: 2};
    });

    it('should call the resource service correctly', function() {
      calResourceService.acceptResourceReservation.returns($q.when({}));

      var controller = initController();

      controller.resource = resource;
      controller.event = event;
      controller.acceptResourceReservation();

      $rootScope.$digest();

      expect(calResourceService.acceptResourceReservation).to.have.been.calledWith(resource._id, event.id);
      expect(notifySpy).to.have.been.calledWith('', sinon.match(/Resource reservation confirmed!/));
    });

    it('should notify on error', function() {
      calResourceService.acceptResourceReservation.returns($q.reject(new Error()));

      var controller = initController();

      controller.resource = resource;
      controller.event = event;
      controller.acceptResourceReservation();

      $rootScope.$digest();

      expect(calResourceService.acceptResourceReservation).to.have.been.calledWith(resource._id, event.id);
      expect(notifySpy).to.have.been.calledWith('', sinon.match(/Cannot change the resource reservation/));
    });
  });

  describe('The declineResourceReservation function', function() {
    var resource, event;

    beforeEach(function() {
      resource = {_id: 1};
      event = {id: 2};
    });

    it('should call the resource service correctly', function() {
      calResourceService.declineResourceReservation.returns($q.when({}));

      var controller = initController();

      controller.resource = resource;
      controller.event = event;
      controller.declineResourceReservation();

      $rootScope.$digest();

      expect(calResourceService.declineResourceReservation).to.have.been.calledWith(resource._id, event.id);
      expect(notifySpy).to.have.been.calledWith('', sinon.match(/Resource reservation declined!/));
    });

    it('should notify on error', function() {
      calResourceService.declineResourceReservation.returns($q.reject(new Error()));

      var controller = initController();

      controller.resource = resource;
      controller.event = event;
      controller.declineResourceReservation();

      $rootScope.$digest();

      expect(calResourceService.declineResourceReservation).to.have.been.calledWith(resource._id, event.id);
      expect(notifySpy).to.have.been.calledWith('', sinon.match(/Cannot change the resource reservation/));
    });
  });
});
