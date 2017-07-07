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
    session,
    CAL_CALENDAR_SHARED_TYPE;

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
    angular.mock.inject(function(_$rootScope_, _$controller_, _$q_, _$log_, _calendarService_, _calendarHomeService_, _notificationFactory_, _session_, _CAL_CALENDAR_SHARED_TYPE_) {
      $rootScope = _$rootScope_;
      $controller = _$controller_;
      $q = _$q_;
      $log = _$log_;
      calendarService = _calendarService_;
      notificationFactory = _notificationFactory_;
      calendarHomeService = _calendarHomeService_;
      session = _session_;
      CAL_CALENDAR_SHARED_TYPE = _CAL_CALENDAR_SHARED_TYPE_;
    });
  });

  beforeEach(function() {
    sinon.stub(calendarService, 'listDelegationCalendars', function() {
      return $q.when([]);
    });
  });

  function initController() {
    return $controller('CalCalendarSharedConfigurationController');
  }

  describe('onInit', function() {
    it('should call calendarService.listDelegationCalendars', function() {
      initController();

      expect(calendarService.listDelegationCalendars).to.have.been.calledWith(session.user._id, 'noresponse');
    });
  });

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
      var sharedCalendar = {
        _id: 'first delegation',
        getOwner: function() {
          return $q.when(user);
        }
      };

      calendarService.listDelegationCalendars.restore();

      sinon.stub(calendarService, 'listDelegationCalendars', function() {
        return $q.when([sharedCalendar]);
      });
      var listCalendarsStub = sinon.stub(calendarService, 'listCalendars', function() {
        return $q.when([]);
      });
      var controller = initController();

      controller.onUserAdded(user);
      $rootScope.$digest();

      expect(listPublicCalendarsStub).to.have.been.calledWith(user._id);
      expect(listCalendarsStub).to.have.been.calledWith(calendarHomeId);
      expect(calendarService.listDelegationCalendars).to.have.been.calledWith(session.user._id, 'noresponse');
      expect(controller.calendarsPerUser).to.shallowDeepEqual([{ user: user, calendar: calendar }, { user: user, calendar: sharedCalendar }]);
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
      var controller = initController();

      controller.calendarsPerUser.push({calendar: calendar, user: user});
      controller.calendarsPerUser.push({calendar: anotherCalendar, user: anotherUser});
      controller.onUserAdded(user);
      $rootScope.$digest();

      expect(listPublicCalendarsStub).to.have.been.calledWith(user._id);
      expect(listCalendarsStub).to.have.been.calledWith(calendarHomeId);
      expect(userAndExternalCalendars).to.have.been.calledWith([subscribed]);
      expect(calendarService.listDelegationCalendars).to.have.been.calledWith(session.user._id, 'noresponse');
      expect(controller.calendarsPerUser).to.have.lengthOf(2);
    });

    it('should log error when public calendars fetch fails', function() {
      var listPublicCalendarsStub = sinon.stub(calendarService, 'listPublicCalendars', function() {
        return $q.reject(new Error('I failed'));
      });
      var logSpy = sinon.spy($log, 'error');
      var controller = initController();

      controller.onUserAdded(user);
      $rootScope.$digest();

      expect(listPublicCalendarsStub).to.have.been.calledWith(user._id);
      expect(calendarService.listDelegationCalendars).to.have.been.calledWith(session.user._id, 'noresponse');
      expect(logSpy).to.have.been.calledOnce;
      expect(controller.calendarsPerUser).to.be.empty;
    });
  });

  describe('The onUserRemoved function', function() {
    it('should not change the controller calendars when user is not defined', function() {
      var controller = initController();

      controller.calendarsPerUser.push({calendar: calendar, user: user});
      controller.onUserRemoved();
      $rootScope.$digest();

      expect(controller.calendarsPerUser).to.have.lengthOf(1);
      expect(calendarService.listDelegationCalendars).to.have.been.calledWith(session.user._id, 'noresponse');
    });

    it('should remove all the calendars of the given user', function() {
      var controller = initController();

      controller.calendarsPerUser.push({calendar: calendar, user: user});
      controller.calendarsPerUser.push({calendar: anotherCalendar, user: anotherUser});

      controller.onUserRemoved(user);
      $rootScope.$digest();

      expect(calendarService.listDelegationCalendars).to.have.been.calledWith(session.user._id, 'noresponse');
      expect(controller.calendarsPerUser).to.deep.equal([{calendar: anotherCalendar, user: anotherUser}]);
    });
  });

  describe('The addSharedCalendars function', function() {
    beforeEach(function() {
      sinon.stub(calendarHomeService, 'getUserCalendarHomeId', function() {
        return $q.when(calendarHomeId);
      });

      sinon.stub(calendarService, 'subscribe', function() {
        return $q.when([]);
      });
      sinon.stub(calendarService, 'updateInviteStatus', function() {
        return $q.when([]);
      });

      sinon.spy(notificationFactory, 'weakInfo');
      sinon.spy(notificationFactory, 'weakError');
    });

    it('should not call subscribe service when no public calendar has been selected', function() {
      var controller = initController();

      controller.calendarsPerUser.push({calendar: calendar, user: user});
      controller.calendarsPerUser.push({calendar: anotherCalendar, user: anotherUser});

      controller.addSharedCalendars();
      $rootScope.$digest();

      expect(calendarHomeService.getUserCalendarHomeId).to.not.have.been.called;
      expect(calendarService.subscribe).to.not.have.been.called;
      expect(notificationFactory.weakInfo).to.have.been.calledOnce;
      expect(notificationFactory.weakError).to.not.have.been.called;
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

      controller.calendarsPerUser.push({calendar: calendar, user: user, isSelected: true, type: CAL_CALENDAR_SHARED_TYPE.PUBLIC});
      controller.calendarsPerUser.push({calendar: anotherCalendar, user: anotherUser, isSelected: true, type: CAL_CALENDAR_SHARED_TYPE.PUBLIC});
      controller.calendarsPerUser.push({calendar: anotherCalendar, user: anotherUser, isSelected: false, type: CAL_CALENDAR_SHARED_TYPE.PUBLIC});

      controller.addSharedCalendars();
      $rootScope.$digest();

      expect(CalendarCollectionShell.from).to.have.been.calledFourth;
      expect(calendarService.subscribe).to.have.been.calledTwice;
      expect(notificationFactory.weakInfo).to.have.been.calledOnce;
      expect(notificationFactory.weakError).to.not.have.been.called;
    });

    it('should update invite status to all the selected delegation calendars', function() {
      var controller = initController();
      var shell = {foo: 'bar'};

      CalendarCollectionShell.from = sinon.spy(function() {
        return shell;
      });
      CalendarCollectionShell.buildHref = sinon.spy(function(home, id) {
        return home + id;
      });

      controller.calendarsPerUser.push({calendar: calendar, user: user, isSelected: true, type: CAL_CALENDAR_SHARED_TYPE.DELEGATION});
      controller.calendarsPerUser.push({calendar: anotherCalendar, user: anotherUser, isSelected: true, type: CAL_CALENDAR_SHARED_TYPE.DELEGATION});
      controller.calendarsPerUser.push({calendar: anotherCalendar, user: anotherUser, isSelected: false, type: CAL_CALENDAR_SHARED_TYPE.DELEGATION});

      controller.addSharedCalendars();
      $rootScope.$digest();

      expect(CalendarCollectionShell.from).to.have.been.calledFourth;
      expect(calendarService.subscribe).to.not.have.been.called;
      expect(calendarService.updateInviteStatus).to.have.been.calledTwice;
      expect(notificationFactory.weakInfo).to.have.been.calledOnce;
      expect(notificationFactory.weakError).to.not.have.been.called;
    });

    it('should reject when one subscription fails', function() {
      var controller = initController();
      var error = new Error('I failed to subscribe');
      var shell = {foo: 'bar'};

      calendarService.subscribe.restore();

      sinon.stub(calendarService, 'subscribe', function() {
        return $q.reject(error);
      });

      CalendarCollectionShell.from = sinon.spy(function() {
        return shell;
      });
      CalendarCollectionShell.buildHref = sinon.spy(function(home, id) {
        return home + id;
      });

      controller.calendarsPerUser.push({calendar: calendar, user: user, isSelected: true, type: CAL_CALENDAR_SHARED_TYPE.PUBLIC});
      controller.calendarsPerUser.push({calendar: anotherCalendar, user: anotherUser, isSelected: true, type: CAL_CALENDAR_SHARED_TYPE.PUBLIC});

      controller.addSharedCalendars();
      $rootScope.$digest();

      expect(CalendarCollectionShell.from).to.have.been.calledFourth;
      expect(calendarService.subscribe).to.have.been.calledTwice;
      expect(notificationFactory.weakInfo).to.not.have.been.called;
      expect(notificationFactory.weakError).to.have.been.called;
    });

    it('should reject when one acceptInvitation fails', function() {
      var controller = initController();
      var error = new Error('I failed to acceptInvitation');
      var shell = {foo: 'bar'};

      calendarService.updateInviteStatus.restore();

      sinon.stub(calendarService, 'updateInviteStatus', function() {
        return $q.reject(error);
      });

      CalendarCollectionShell.from = sinon.spy(function() {
        return shell;
      });
      CalendarCollectionShell.buildHref = sinon.spy(function(home, id) {
        return home + id;
      });

      controller.calendarsPerUser.push({calendar: calendar, user: user, isSelected: true, type: CAL_CALENDAR_SHARED_TYPE.DELEGATION});
      controller.calendarsPerUser.push({calendar: anotherCalendar, user: anotherUser, isSelected: true, type: CAL_CALENDAR_SHARED_TYPE.DELEGATION});

      controller.addSharedCalendars();
      $rootScope.$digest();

      expect(CalendarCollectionShell.from).to.have.been.calledFourth;
      expect(calendarService.updateInviteStatus).to.have.been.calledTwice;
      expect(notificationFactory.weakInfo).to.not.have.been.called;
      expect(notificationFactory.weakError).to.have.been.called;
    });
  });
});
