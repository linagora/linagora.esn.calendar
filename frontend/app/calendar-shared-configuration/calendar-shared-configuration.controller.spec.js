'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The CalCalendarSharedConfigurationController controller', function() {
  var $rootScope,
    $controller,
    $q,
    $log,
    calendarService,
    calendarHomeService,
    user,
    anotherUser,
    calendar,
    anotherCalendar,
    notificationFactory,
    calendarHomeId,
    CalendarCollectionShell,
    userAndExternalCalendars,
    publicCalendars,
    session;

  beforeEach(function() {
    CalendarCollectionShell = {};
    publicCalendars = [];
    userAndExternalCalendars = sinon.spy(function() {
      return {
        publicCalendars: publicCalendars
      };
    });
  });

  beforeEach(function() {
    angular.mock.module('esn.calendar', function($provide) {
      $provide.value('CalendarCollectionShell', CalendarCollectionShell);
      $provide.value('userAndExternalCalendars', userAndExternalCalendars);
    });
  });

  beforeEach(function() {
    calendarHomeId = 'calendarHomeId';
    user = {_id: 1};
    anotherUser = {_id: 2};
    calendar = {_id: 3};
    anotherCalendar = {_id: 4};
    angular.mock.inject(function(_$rootScope_, _$controller_, _$q_, _$log_, _calendarService_, _calendarHomeService_, _notificationFactory_, _session_) {
      $rootScope = _$rootScope_;
      $controller = _$controller_;
      $q = _$q_;
      $log = _$log_;
      calendarService = _calendarService_;
      notificationFactory = _notificationFactory_;
      calendarHomeService = _calendarHomeService_;
      session = _session_;
    });
  });

  function initController() {
    return $controller('CalCalendarSharedConfigurationController');
  }

  describe('The getSelectedCalendars function', function() {
    it('should return empty array when no calendar are selected', function() {
      var controller = initController();

      controller.calendarsPerUser.push({user: user, calendar: calendar});

      expect(controller.getSelectedCalendars()).to.be.empty;
    });

    it('should return only calendars which have been selected', function() {
      var controller = initController();

      controller.calendarsPerUser.push({user: user, calendar: calendar, isSelected: true}, {user: user, calendar: anotherCalendar});

      expect(controller.getSelectedCalendars(controller.calendarsPerUser)).to.deep.equal([calendar]);
    });
  });

  describe('The onUserAdded function', function() {
    beforeEach(function() {
      sinon.stub(calendarHomeService, 'getUserCalendarHomeId', function() {
        return $q.when(calendarHomeId);
      });
    });

    it('should return when user is undefined', function() {
      var spy = sinon.stub(calendarService, 'listPublicCalendars');
      var controller = initController();

      controller.onUserAdded();

      expect(spy).to.not.have.been.called;
    });

    it('should fill controller calendarsPerUser with the user calendars', function() {
      var listPublicCalendarsStub = sinon.stub(calendarService, 'listPublicCalendars', function() {
        return $q.when([calendar]);
      });
      var listCalendarsStub = sinon.stub(calendarService, 'listCalendars', function() {
        return $q.when([]);
      });
      var listDelegationCalendarsStub = sinon.stub(calendarService, 'listDelegationCalendars', function() {
        return $q.when([]);
      });
      var controller = initController();

      controller.onUserAdded(user);
      $rootScope.$digest();

      expect(listPublicCalendarsStub).to.have.been.calledWith(user._id);
      expect(listCalendarsStub).to.have.been.calledWith(calendarHomeId);
      expect(listDelegationCalendarsStub).to.have.been.calledWith(session.user._id, 'noresponse');
      expect(controller.calendarsPerUser).to.shallowDeepEqual([{user: user, calendar: calendar}]);
    });

    it('should not fill calendarsPerUser with a calendar which has already been subscribed', function() {
      var subscribedHref = 'This is the href of the original calendar';
      var subscribed = { source: { href: subscribedHref }};

      calendar.href = subscribedHref;
      publicCalendars.push(subscribed);

      var listPublicCalendarsStub = sinon.stub(calendarService, 'listPublicCalendars', function() {
        return $q.when([calendar]);
      });
      var listCalendarsStub = sinon.stub(calendarService, 'listCalendars', function() {
        return $q.when([subscribed]);
      });
      var listDelegationCalendarsStub = sinon.stub(calendarService, 'listDelegationCalendars', function() {
        return $q.when([]);
      });
      var controller = initController();

      controller.calendarsPerUser.push({calendar: calendar, user: user});
      controller.calendarsPerUser.push({calendar: anotherCalendar, user: anotherUser});
      controller.onUserAdded(user);
      $rootScope.$digest();

      expect(listPublicCalendarsStub).to.have.been.calledWith(user._id);
      expect(listCalendarsStub).to.have.been.calledWith(calendarHomeId);
      expect(userAndExternalCalendars).to.have.been.calledWith([subscribed]);
      expect(listDelegationCalendarsStub).to.have.been.calledWith(session.user._id, 'noresponse');
      expect(controller.calendarsPerUser).to.have.lengthOf(2);
    });

    it('should log error when public calendars fetch fails', function() {
      var listPublicCalendarsStub = sinon.stub(calendarService, 'listPublicCalendars', function() {
        return $q.reject(new Error('I failed'));
      });
      var listDelegationCalendarsStub = sinon.stub(calendarService, 'listDelegationCalendars', function() {
        return $q.when([]);
      });
      var logSpy = sinon.spy($log, 'error');
      var controller = initController();

      controller.onUserAdded(user);
      $rootScope.$digest();

      expect(listPublicCalendarsStub).to.have.been.calledWith(user._id);
      expect(listDelegationCalendarsStub).to.have.been.calledWith(session.user._id, 'noresponse');
      expect(logSpy).to.have.been.calledOnce;
      expect(controller.calendarsPerUser).to.be.empty;
    });
  });

  describe('The onUserRemoved function', function() {
    it('should not change the controller calendars when user is not defined', function() {
      var listDelegationCalendarsStub = sinon.stub(calendarService, 'listDelegationCalendars', function() {
        return $q.when([]);
      });
      var controller = initController();

      controller.calendarsPerUser.push({calendar: calendar, user: user});
      controller.onUserRemoved();
      $rootScope.$digest();

      expect(controller.calendarsPerUser).to.have.lengthOf(1);
      expect(listDelegationCalendarsStub).to.have.been.calledWith(session.user._id, 'noresponse');
    });

    it('should remove all the calendars of the given user', function() {
      var listDelegationCalendarsStub = sinon.stub(calendarService, 'listDelegationCalendars', function() {
        return $q.when([]);
      });
      var controller = initController();

      controller.calendarsPerUser.push({calendar: calendar, user: user});
      controller.calendarsPerUser.push({calendar: anotherCalendar, user: anotherUser});

      controller.onUserRemoved(user);
      $rootScope.$digest();

      expect(listDelegationCalendarsStub).to.have.been.calledWith(session.user._id, 'noresponse');
      expect(controller.calendarsPerUser).to.deep.equal([{calendar: anotherCalendar, user: anotherUser}]);
    });
  });

  describe('The subscribeToSelectedCalendars function', function() {
    var weakInfoSpy, weakErrorSpy, updateInviteStatusStub, subscribeStub, getUserCalendarHomeIdStub, listDelegationCalendarsStub;

    beforeEach(function() {
      getUserCalendarHomeIdStub = sinon.stub(calendarHomeService, 'getUserCalendarHomeId', function() {
        return $q.when(calendarHomeId);
      });

      listDelegationCalendarsStub = sinon.stub(calendarService, 'listDelegationCalendars', function() {
        return $q.when([]);
      });
      subscribeStub = sinon.stub(calendarService, 'subscribe', function() {
        return $q.when([]);
      });
      updateInviteStatusStub = sinon.stub(calendarService, 'updateInviteStatus', function() {
        return $q.when([]);
      });

      weakInfoSpy = sinon.spy(notificationFactory, 'weakInfo');
      weakErrorSpy = sinon.spy(notificationFactory, 'weakError');
    });

    it('should not call subscribe service when no calendar has been selected', function() {
      var controller = initController();

      controller.calendarsPerUser.push({calendar: calendar, user: user});
      controller.calendarsPerUser.push({calendar: anotherCalendar, user: anotherUser});

      controller.addSharedCalendars();
      $rootScope.$digest();

      expect(getUserCalendarHomeIdStub).to.not.have.been.called;
      expect(subscribeStub).to.not.have.been.called;
      expect(listDelegationCalendarsStub).to.have.been.calledWith(session.user._id, 'noresponse');
      expect(weakInfoSpy).to.have.been.calledOnce;
      expect(weakErrorSpy).to.not.have.been.called;
    });

    it('should subscribe to all the selected calendars', function() {
      var controller = initController();
      var shell = {foo: 'bar'};

      CalendarCollectionShell.from = sinon.spy(function() {
        return shell;
      });
      CalendarCollectionShell.buildHref = sinon.spy(function(home, id) {
        return home + id;
      });

      controller.calendarsPerUser.push({calendar: calendar, user: user, isSelected: true, type: 'public'});
      controller.calendarsPerUser.push({calendar: anotherCalendar, user: anotherUser, isSelected: true, type: 'public'});
      controller.calendarsPerUser.push({calendar: anotherCalendar, user: anotherUser, isSelected: false, type: 'public'});

      controller.addSharedCalendars();
      $rootScope.$digest();

      expect(CalendarCollectionShell.from).to.have.been.calledFourth;
      expect(subscribeStub).to.have.been.calledTwice;
      expect(weakInfoSpy).to.have.been.calledOnce;
      expect(weakErrorSpy).to.not.have.been.called;
    });

    it('should update invite status to all the selected calendars', function() {
      var controller = initController();
      var shell = {foo: 'bar'};

      CalendarCollectionShell.from = sinon.spy(function() {
        return shell;
      });
      CalendarCollectionShell.buildHref = sinon.spy(function(home, id) {
        return home + id;
      });

      controller.calendarsPerUser.push({calendar: calendar, user: user, isSelected: true, type: 'delegation'});
      controller.calendarsPerUser.push({calendar: anotherCalendar, user: anotherUser, isSelected: true, type: 'delegation'});
      controller.calendarsPerUser.push({calendar: anotherCalendar, user: anotherUser, isSelected: false, type: 'delegation'});

      controller.addSharedCalendars();
      $rootScope.$digest();

      expect(CalendarCollectionShell.from).to.have.been.calledFourth;
      expect(subscribeStub).to.not.have.been.called;
      expect(updateInviteStatusStub).to.have.been.calledTwice;
      expect(weakInfoSpy).to.have.been.calledOnce;
      expect(weakErrorSpy).to.not.have.been.called;
    });

    it('should reject when one subscription fails', function() {
      var controller = initController();
      var error = new Error('I failed to subscribe');
      var shell = {foo: 'bar'};

      subscribeStub.restore();
      subscribeStub = sinon.stub(calendarService, 'subscribe', function() {
        return $q.reject(error);
      });

      CalendarCollectionShell.from = sinon.spy(function() {
        return shell;
      });
      CalendarCollectionShell.buildHref = sinon.spy(function(home, id) {
        return home + id;
      });

      controller.calendarsPerUser.push({calendar: calendar, user: user, isSelected: true, type: 'public'});
      controller.calendarsPerUser.push({calendar: anotherCalendar, user: anotherUser, isSelected: true, type: 'public'});

      controller.addSharedCalendars();
      $rootScope.$digest();

      expect(CalendarCollectionShell.from).to.have.been.calledFourth;
      expect(subscribeStub).to.have.been.calledTwice;
      expect(weakInfoSpy).to.not.have.been.called;
      expect(weakErrorSpy).to.have.been.called;
    });
  });
});
