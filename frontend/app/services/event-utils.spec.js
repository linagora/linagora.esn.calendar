'use strict';

/* global sinon, chai: false */

var expect = chai.expect;

describe('The calEventUtils service', function() {
  var event, userEmail;

  beforeEach(function() {
    var emailMap = {};

    userEmail = 'aAttendee@open-paas.org';
    emailMap[userEmail] = true;

    var asSession = {
      user: {
        _id: '123456',
        emails: [userEmail],
        emailMap: emailMap
      },
      domain: {
        company_name: 'test'
      }
    };

    angular.mock.module('esn.calendar');
    angular.mock.module('esn.ical');
    angular.mock.module(function($provide) {
      $provide.factory('session', function($q) {
        asSession.ready = $q.when(asSession);

        return asSession;
      });
    });

    var vcalendar = {};

    vcalendar.hasOwnProperty = null;
    event = {
      title: 'myTitle',
      description: 'description',
      vcalendar: vcalendar,
      attendees: [],
      isInstance: function() { return false; },
      isOverOneDayOnly: sinon.spy(),
      isPrivate: sinon.stub().returns(false)
    };
  });

  beforeEach(angular.mock.inject(function(calEventUtils, $rootScope, calMoment, CalendarShell, CAL_MAX_DURATION_OF_SMALL_EVENT) {
    this.calEventUtils = calEventUtils;
    this.$rootScope = $rootScope;
    this.calMoment = calMoment;
    this.CalendarShell = CalendarShell;
    this.CAL_MAX_DURATION_OF_SMALL_EVENT = CAL_MAX_DURATION_OF_SMALL_EVENT;
    event.start = calMoment();
    event.end = event.start.add(this.CAL_MAX_DURATION_OF_SMALL_EVENT.DESKTOP, 'minutes');
  }));

  describe('applyReply', function() {
    it('should update reply\'s attendee participation without modifying other', function() {
      var origEvent = this.CalendarShell.fromIncompleteShell({title: 'second world war'});

      origEvent.attendees = [{
        email: 'winston.churchill@demo.open-paas.org',
        partstat: 'ACCEPTED'
      }, {
        email: 'philippe.petain@demo.open-paas.org',
        partstat: 'NEEDS-ACTION'
      }];

      var reply = this.CalendarShell.fromIncompleteShell({title: 'second world war'});

      reply.attendees = [{
        email: 'philippe.petain@demo.open-paas.org',
        partstat: 'DECLINED'
      }];

      this.calEventUtils.applyReply(origEvent, reply);

      expect(origEvent.attendees).to.shallowDeepEqual({
        0: {
          email: 'winston.churchill@demo.open-paas.org',
          partstat: 'ACCEPTED'
        },
        1: {
          email: 'philippe.petain@demo.open-paas.org',
          partstat: 'DECLINED'
        },
        length: 2
      });
    });
  });

  describe('isOrganizer function', function() {

    it('should return true when the event organizer is the current user', function() {
      var event = {
        organizer: {
          email: 'aAttendee@open-paas.org'
        }
      };

      expect(this.calEventUtils.isOrganizer(event)).to.be.true;
    });

    it('should return false when the event organizer is not the current user', function() {
      var event = {
        organizer: {
          email: 'not-organizer@bar.com'
        }
      };

      expect(this.calEventUtils.isOrganizer(event)).to.be.false;
    });

    it('should return true when the event is undefined', function() {
      expect(this.calEventUtils.isOrganizer(null)).to.be.true;
    });

    it('should return true when the event organizer is undefined', function() {
      var event = {
        organizer: null
      };

      expect(this.calEventUtils.isOrganizer(event)).to.be.true;
    });
  });

  describe('hasSignificantChange function', function() {
    it('should return true when the events do not have the same start date', function() {
      var newEvent = this.CalendarShell.fromIncompleteShell({
        start: this.calMoment('2015-01-01 09:00:00'),
        end: this.calMoment('2015-01-01 10:00:00')
      });
      var oldEvent = this.CalendarShell.fromIncompleteShell({
        start: this.calMoment('2015-01-01 08:00:00'),
        end: this.calMoment('2015-01-01 10:00:00')
      });

      expect(this.calEventUtils.hasSignificantChange(oldEvent, newEvent)).to.be.true;
    });

    it('should return true when the events do not have the same end date', function() {
      var newEvent = this.CalendarShell.fromIncompleteShell({
        start: this.calMoment('2015-01-01 09:00:00'),
        end: this.calMoment('2015-01-01 10:00:00')
      });
      var oldEvent = this.CalendarShell.fromIncompleteShell({
        start: this.calMoment('2015-01-01 09:00:00'),
        end: this.calMoment('2015-01-01 11:00:00')
      });

      expect(this.calEventUtils.hasSignificantChange(oldEvent, newEvent)).to.be.true;
    });

    it('should return true when the events do not have the same due property', function() {
      var newEvent = this.CalendarShell.fromIncompleteShell({
        start: this.calMoment('2015-01-01 09:00:00'),
        end: this.calMoment('2015-01-01 11:00:00'),
        due: 'due1'
      });
      var oldEvent = this.CalendarShell.fromIncompleteShell({
        start: this.calMoment('2015-01-01 09:00:00'),
        end: this.calMoment('2015-01-01 11:00:00'),
        due: 'due2'
      });

      expect(this.calEventUtils.hasSignificantChange(oldEvent, newEvent)).to.be.true;
    });

    it('should return true when the events do not have the same rrule', function() {
      var newEvent = this.CalendarShell.fromIncompleteShell({
        start: this.calMoment('2015-01-01 09:00:00'),
        end: this.calMoment('2015-01-01 11:00:00'),
        due: 'due',
        rrule: {
          until: this.calMoment('2015-01-03 11:00:00').toDate()
        }
      });
      var oldEvent = this.CalendarShell.fromIncompleteShell({
        start: this.calMoment('2015-01-01 09:00:00'),
        end: this.calMoment('2015-01-01 11:00:00'),
        due: 'due',
        rrule: {
          until: this.calMoment('2015-01-02 11:00:00').toDate()
        }
      });

      expect(this.calEventUtils.hasSignificantChange(oldEvent, newEvent)).to.be.true;
    });

    it('should return true when the events do not have the same exdate', function() {
      var newEvent = this.CalendarShell.fromIncompleteShell({
        start: this.calMoment('2015-01-01 09:00:00'),
        end: this.calMoment('2015-01-01 11:00:00'),
        due: 'due',
        rrule: {
          frequency: 1
        },
        exdate: [
          this.calMoment('2015-01-02 11:00:00')
        ]
      });
      var oldEvent = this.CalendarShell.fromIncompleteShell({
        start: this.calMoment('2015-01-01 09:00:00'),
        end: this.calMoment('2015-01-01 11:00:00'),
        due: 'due',
        rrule: {
          frequency: 1
        },
        exdate: [
          this.calMoment('2015-01-03 11:00:00')
        ]
      });

      expect(this.calEventUtils.hasSignificantChange(oldEvent, newEvent)).to.be.true;
    });

    it('should return true when the events do not have the same status', function() {
      var newEvent = this.CalendarShell.fromIncompleteShell({
        start: this.calMoment('2015-01-01 09:00:00'),
        end: this.calMoment('2015-01-01 11:00:00'),
        due: 'due',
        rrule: {
          frequency: 1
        },
        exdate: [
          this.calMoment('2015-01-02 11:00:00')
        ],
        status: 'REFUSED'
      });
      var oldEvent = this.CalendarShell.fromIncompleteShell({
        start: this.calMoment('2015-01-01 09:00:00'),
        end: this.calMoment('2015-01-01 11:00:00'),
        due: 'due',
        rrule: {
          frequency: 1
        },
        exdate: [
          this.calMoment('2015-01-02 11:00:00')
        ],
        status: 'ACCEPTED'
      });

      expect(this.calEventUtils.hasSignificantChange(oldEvent, newEvent)).to.be.true;
    });

    it('should return false when the events are the same', function() {
      var newEvent = this.CalendarShell.fromIncompleteShell({
        start: this.calMoment('2015-01-01 09:00:00'),
        end: this.calMoment('2015-01-01 11:00:00'),
        due: 'due',
        rrule: {
          frequency: 1
        },
        exdate: [
          this.calMoment('2015-01-02 11:00:00')
        ],
        status: 'ACCEPTED'
      });
      var oldEvent = this.CalendarShell.fromIncompleteShell({
        start: this.calMoment('2015-01-01 09:00:00'),
        end: this.calMoment('2015-01-01 11:00:00'),
        due: 'due',
        rrule: {
          frequency: 1
        },
        exdate: [
          this.calMoment('2015-01-02 11:00:00')
        ],
        status: 'ACCEPTED'
      });

      expect(this.calEventUtils.hasSignificantChange(oldEvent, newEvent)).to.be.false;
    });
  });

  describe('isNew function', function() {
    it('should return true if event.id is undefined', function() {
      expect(this.calEventUtils.isNew({})).to.be.true;
    });

    it('should return false if event.etag is defined', function() {
      expect(this.calEventUtils.isNew({etag: '123'})).to.be.false;
    });
  });

  describe('setBackgroundColor function', function() {
    it('should set the background color of the good calendar', function() {

      var event = {
        id: 'paint it black',
        calendarId: 'altamont'
      };

      var calendars = [{id: 'woodstock', color: 'pink'}, {id: 'altamont', color: 'black'}];

      expect(this.calEventUtils.setBackgroundColor(event, calendars)).to.equal(event);
      expect(event.backgroundColor).to.equal('black');
    });
  });

  describe('hasAttendees fn', function() {
    it('should return false when undefined', function() {
      expect(this.calEventUtils.hasAttendees({})).to.be.false;
    });

    it('should return false when = 0 ', function() {
      expect(this.calEventUtils.hasAttendees({
        attendees: []
      })).to.be.false;
    });

    it('should return true when > 0', function() {
      expect(this.calEventUtils.hasAttendees({
        attendees: ['1']
      })).to.be.true;
    });
  });

  describe('getUserAttendee fn', function() {

    it('should return undefined when event has no "attendees" property', function() {
      expect(this.calEventUtils.getUserAttendee({})).to.equal(undefined);
    });

    it('should return undefined when event has 0 attendees', function() {
      expect(this.calEventUtils.getUserAttendee({ attendees: [] })).to.equal(undefined);
    });

    it('should return undefined when user is not found in event attendees', function() {
      expect(this.calEventUtils.getUserAttendee({
        attendees: [{
          email: 'contact@domain.com'
        }]
      })).to.equal(undefined);
    });

    it('should return null when user is not found in event attendees', function() {
      var attendee = {
        email: 'aAttendee@open-paas.org'
      };

      expect(this.calEventUtils.getUserAttendee({ attendees: [attendee] })).to.deep.equal(attendee);
    });

  });

});
