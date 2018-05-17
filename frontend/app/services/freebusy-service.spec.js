'use strict';

/* global chai, __FIXTURES__: false */

var expect = chai.expect;

describe('The calFreebusyService service', function() {
  var $httpBackend, calFreebusyService, calMoment, CAL_ACCEPT_HEADER;
  var vfreebusy;

  beforeEach(function() {
    angular.mock.module('esn.calendar');

    angular.mock.inject(function(_$httpBackend_, _calFreebusyService_, _CAL_ACCEPT_HEADER_, _calMoment_) {
      $httpBackend = _$httpBackend_;
      calFreebusyService = _calFreebusyService_;
      calMoment = _calMoment_;
      CAL_ACCEPT_HEADER = _CAL_ACCEPT_HEADER_;
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
        match: { start: '20140101T000000', end: '20140102T000000' }
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
});
