'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The CalSettingsCalendarsController controller', function() {
  var $rootScope, $controller, $scope, $log, session, calendarService, $q, calendar, otherCalendar, calendars, userAndExternalCalendars, calCalendarDeleteConfirmationModalService;

  beforeEach(function() {
    session = {
      ready: {then: function() {}},
      user: {
        _id: 1
      }
    };
    calendarService = {};
    calCalendarDeleteConfirmationModalService = sinon.spy();
    calendar = {uniqueId: 1, calendarHomeId: 'MyId', name: 'MyName'};
    otherCalendar = {uniqueId: 2, calendarHomeId: 'MyOtherId', name: 'MyOtherName'};
    calendars = [calendar, otherCalendar];
    userAndExternalCalendars = sinon.spy(function() {
      return {
        userCalendars: calendars
      };
    });
  });

  beforeEach(function() {
    angular.mock.module('esn.calendar', function($provide) {
      $provide.value('session', session);
      $provide.value('calendarService', calendarService);
      $provide.value('userAndExternalCalendars', userAndExternalCalendars);
      $provide.value('calCalendarDeleteConfirmationModalService', calCalendarDeleteConfirmationModalService);
    });
  });

  beforeEach(function() {
    angular.mock.inject(function(_$rootScope_, _$controller_, _$q_, _$log_) {
      $rootScope = _$rootScope_;
      $controller = _$controller_;
      $q = _$q_;
      $log = _$log_;
      $scope = $rootScope.$new();
    });
  });

  function initController() {
    return $controller('CalSettingsCalendarsController', { $scope: $scope });
  }

  describe('The $onInit function', function() {
    it('should get the calendars from the calendarService', function() {
      var calendars = [calendar, otherCalendar];

      calendarService.listCalendars = sinon.spy(function() {
        return $q.when(calendars);
      });

      var controller = initController();

      controller.$onInit();
      $rootScope.$digest();

      expect(calendarService.listCalendars).to.have.been.calledWith(session.user._id);
      expect(controller.calendars).to.deep.equal(calendars);
    });
  });

  describe('The remove function', function() {
    it('should show the confirmation dialog', function() {
      var controller = initController();

      controller.calendars = [];
      controller.remove(calendar);

      expect(calCalendarDeleteConfirmationModalService).to.have.been.calledOnce;
    });

    it('should remove the calendar', function() {
      var controller = initController();

      calendarService.removeCalendar = sinon.spy(function() {
        return $q.when();
      });

      controller.calendars = [calendar, otherCalendar];
      controller.remove(calendar);

      var removeCalendar = calCalendarDeleteConfirmationModalService.firstCall.args[1];

      removeCalendar();
      expect(calendarService.removeCalendar).to.have.been.calledWith(calendar.calendarHomeId, calendar);
      $rootScope.$digest();

      expect(controller.calendars).to.deep.equals([otherCalendar]);
    });

    it('should not remove calendar is calendarService failed', function() {
      var logSpy = sinon.spy($log, 'error');
      var controller = initController();
      var error = new Error('I failed...');

      calendarService.removeCalendar = sinon.spy(function() {
        return $q.reject(error);
      });

      controller.calendars = [calendar, otherCalendar];
      controller.remove(calendar);

      var removeCalendar = calCalendarDeleteConfirmationModalService.firstCall.args[1];

      removeCalendar();

      expect(calendarService.removeCalendar).to.have.been.calledWith(calendar.calendarHomeId, calendar);
      $rootScope.$digest();

      expect(controller.calendars.length).to.equals(2);
      expect(logSpy).to.have.been.calledOnce;
    });
  });
});
