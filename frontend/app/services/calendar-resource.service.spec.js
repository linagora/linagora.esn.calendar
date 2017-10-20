'use strict';

describe('The calResourceService service', function() {
  var calResourceService, $httpBackend, resourceId, eventId;

  beforeEach(function() {
    resourceId = '1';
    eventId = '2';
  });

  beforeEach(function() {
    angular.mock.module('esn.calendar');
  });

  beforeEach(function() {
    angular.mock.inject(function(_$httpBackend_, _calResourceService_) {
      $httpBackend = _$httpBackend_;
      calResourceService = _calResourceService_;
    });
  });

  describe('The acceptResourceReservation function', function() {
    it('should call the API correctly', function() {
      $httpBackend.expect('GET', '/calendar/api/resources/' + resourceId + '/' + eventId + '/participation?status=ACCEPTED').respond({});

      calResourceService.acceptResourceReservation(resourceId, eventId);

      $httpBackend.flush();
    });
  });

  describe('The declineResourceReservation function', function() {
    it('should call the API correctly', function() {
      $httpBackend.expect('GET', '/calendar/api/resources/' + resourceId + '/' + eventId + '/participation?status=DECLINED').respond({});

      calResourceService.declineResourceReservation(resourceId, eventId);

      $httpBackend.flush();
    });
  });
});
