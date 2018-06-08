'use strict';

/* global chai, sinon, __FIXTURES__: false */

var expect = chai.expect;

describe('The calFreebusyService service', function() {
  var vfreebusy, $httpBackend, $rootScope, calFreebusyService, calMoment, CAL_ACCEPT_HEADER, CAL_DAV_DATE_FORMAT;
  var calAttendeeService, calFreebusyAPI;

  beforeEach(function() {
    angular.mock.module('esn.calendar');

    calAttendeeService = {
      getUsersIdsForAttendees: sinon.stub()
    };

    angular.mock.module(function($provide) {
      $provide.value('calAttendeeService', calAttendeeService);
    });
  });

  beforeEach(function() {
    angular.mock.inject(function(_$rootScope_, _$httpBackend_, _calFreebusyAPI_, _calFreebusyService_, _CAL_ACCEPT_HEADER_, _calMoment_, _CAL_DAV_DATE_FORMAT_) {
      $rootScope = _$rootScope_;
      $httpBackend = _$httpBackend_;
      calFreebusyService = _calFreebusyService_;
      calFreebusyAPI = _calFreebusyAPI_;
      calMoment = _calMoment_;
      CAL_ACCEPT_HEADER = _CAL_ACCEPT_HEADER_;
      CAL_DAV_DATE_FORMAT = _CAL_DAV_DATE_FORMAT_;
    });

    function getComponentFromFixture(string) {
      var path = 'frontend/app/fixtures/calendar/vfreebusy_test/' + string;

      return __FIXTURES__[path];
    }

    vfreebusy = JSON.parse(getComponentFromFixture('vfreebusy.json'));
  });

  describe('The listFreebusy fn', function() {

    it('should list freebusy infos', function(done) {
      var data = {
        type: 'free-busy-query',
        match: {
          start: calMoment('20140101T000000').tz('Zulu').format(CAL_DAV_DATE_FORMAT),
          end: calMoment('20140102T000000').tz('Zulu').format(CAL_DAV_DATE_FORMAT)
        }
      };

      var response = {
        _links: {
          self: {
            href: '/calendars/56698ca29e4cf21f66800def.json'
          }
        },
        _embedded: {
          'dav:calendar': [
            {
              _links: {
                self: {
                  href: '/calendars/uid/events.json'
                }
              },
              'dav:name': null,
              'caldav:description': null,
              'calendarserver:ctag': 'http://sabre.io/ns/sync/3',
              'apple:color': null,
              'apple:order': null
            }
          ]
        }
      };

      $httpBackend.expectGET('/dav/api/calendars/uid.json?withFreeBusy=true&withRights=true', { Accept: CAL_ACCEPT_HEADER }).respond(response);

      $httpBackend.expect('REPORT', '/dav/api/calendars/uid/events.json', data).respond(200, {
        _links: {
          self: {href: '/prepath/path/to/calendar.json'}
        },
        data: [
          'vcalendar', [], [
            vfreebusy
          ]
        ]
      });

      var start = calMoment(new Date(2014, 0, 1));
      var end = calMoment(new Date(2014, 0, 2));

      calFreebusyService.listFreebusy('uid', start, end).then(function(freebusies) {
        expect(freebusies).to.be.an.array;
        expect(freebusies.length).to.equal(1);
        expect(freebusies[0].vfreebusy.toJSON()).to.deep.equal(vfreebusy);
      }).finally(done);

      $httpBackend.flush();
    });
  });

  describe('the isAttendeeAvailable function', function() {
    var attendee;
    var handleBackend;

    beforeEach(function() {
      attendee = { id: 'uid' };

      handleBackend = function handleBackned() {
        var response;

        response = {
          _links: {
            self: {
              href: '/calendars/56698ca29e4cf21f66800def.json'
            }
          },
          _embedded: {
            'dav:calendar': [
              {
                _links: {
                  self: {
                    href: '/calendars/uid/events.json'
                  }
                },
                'dav:name': null,
                'caldav:description': null,
                'calendarserver:ctag': 'http://sabre.io/ns/sync/3',
                'apple:color': null,
                'apple:order': null
              }
            ]
          }
        };

        $httpBackend.expectGET('/dav/api/calendars/uid.json?withFreeBusy=true&withRights=true', { Accept: CAL_ACCEPT_HEADER }).respond(response);
        $httpBackend.expect('REPORT', '/dav/api/calendars/uid/events.json', undefined).respond(200, {
          _links: {
            self: {href: '/prepath/path/to/calendar.json'}
          },
          data: [
            'vcalendar', [], [
              vfreebusy
            ]
          ]
        });
      };
    });

    it('should return false on attendee busy', function(done) {
      var busyEvent = {
        start: calMoment('2018-03-03T09:00:00Z'),
        end: calMoment('2018-03-03T13:00:00Z')
      };

      handleBackend();
      calFreebusyService.isAttendeeAvailable(attendee.id, busyEvent.start, busyEvent.end).then(function(isAvailable) {
        expect(isAvailable).to.be.false;

        done();
      });

      $httpBackend.flush();
    });

    it('should return true on attendee free', function(done) {
      var event = {
        start: calMoment('2018-03-03T11:00:00Z'),
        end: calMoment('2018-03-03T12:00:00Z')
      };

      handleBackend();
      calFreebusyService.isAttendeeAvailable(attendee.id, event.start, event.end).then(function(isAvailable) {
        expect(isAvailable).to.be.true;

        done();
      });

      $httpBackend.flush();
    });
  });

  describe('The getAttendeesAvailability function', function() {
    var getBulkFreebusyStatusStub;

    beforeEach(function() {
      getBulkFreebusyStatusStub = sinon.stub(calFreebusyAPI, 'getBulkFreebusyStatus');
    });

    it('should call bulk service with users having an id', function(done) {
      var attendees = [
        { email: 'a@open-paas.org' },
        { email: 'b@open-paas.org' },
        { email: 'c@open-paas.org' }
      ];
      var start = Date.now();
      var end = Date.now();

      calAttendeeService.getUsersIdsForAttendees.returns($q.when([1, undefined, 2]));
      getBulkFreebusyStatusStub.returns($q.when());

      calFreebusyService.getAttendeesAvailability(attendees, start, end)
        .then(function() {
          expect(calAttendeeService.getUsersIdsForAttendees).to.have.been.calledWith(attendees);
          expect(getBulkFreebusyStatusStub).to.have.been.calledWith([1, 2], start, end);
          done();
        })
        .catch(done);

      $rootScope.$digest();
    });
  });

  describe('The areAttendeesAvailable function', function() {
    var start, end, attendees, event, getBulkFreebusyStatusStub;

    beforeEach(function() {
      event = {uid: 123};
      getBulkFreebusyStatusStub = sinon.stub(calFreebusyAPI, 'getBulkFreebusyStatus');
      attendees = [
        { email: 'a@open-paas.org' },
        { email: 'b@open-paas.org' }
      ];
      start = '';
      end = '';
    });

    it('should resolve with true if all attendees are available', function(done) {
      var availability = {
        start: '',
        end: '',
        users: [
          {
            id: 1,
            calendars: [
              {
                id: 1,
                busy: []
              },
              {
                id: 2,
                busy: []
              }
            ]
          },
          {
            id: 2,
            calendars: [
              {
                id: 2,
                busy: []
              },
              {
                id: 22,
                busy: []
              }
            ]
          }
        ]
      };

      calAttendeeService.getUsersIdsForAttendees.returns($q.when([1, 2]));
      getBulkFreebusyStatusStub.returns($q.when(availability));

      calFreebusyService.areAttendeesAvailable(attendees, start, end, [event])
        .then(function(result) {
          expect(result).to.be.true;
          done();
        })
        .catch(done);

      $rootScope.$digest();
    });

    it('should resolve with false if at least one attendee is not available during the period', function(done) {
      var availability = {
        start: '',
        end: '',
        users: [
          {
            id: 1,
            calendars: [
              {
                id: 1,
                busy: []
              },
              {
                id: 2,
                busy: [{id: 'eventId', start: 1, end: 2}]
              }
            ]
          },
          {
            id: 2,
            calendars: [
              {
                id: 2,
                busy: []
              },
              {
                id: 22,
                busy: []
              }
            ]
          }
        ]
      };

      calAttendeeService.getUsersIdsForAttendees.returns($q.when([1, 2]));
      getBulkFreebusyStatusStub.returns($q.when(availability));

      calFreebusyService.areAttendeesAvailable(attendees, start, end, [event])
        .then(function(result) {
          expect(result).to.be.false;
          done();
        })
        .catch(done);

      $rootScope.$digest();
    });
  });
});
