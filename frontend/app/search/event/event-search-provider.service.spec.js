'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The calSearchEventProviderService service', function() {

  var $rootScope, calSearchEventProviderService, $httpBackend, calendarService, esnSearchProvider, calEventService, CAL_ADVANCED_SEARCH_CALENDAR_TYPES;
  var calendarHomeId = 'calendarHomeId';

  var mockUsers = [
    {
      id: '1',
      email: 'user1@mail.com',
      displayName: 'User1',
      name: 'User1',
      profilePictureUrl: 'fake.com/images/profile1.png'
    },
    {
      id: '2',
      email: 'user2@mail.com',
      displayName: 'User2',
      name: 'User2',
      profilePictureUrl: 'fake.com/images/profile2.png'
    }
  ];

  beforeEach(function() {
    esnSearchProvider = function(options) {
      this.options = options;
    };

    module('esn.calendar', function($provide) {
      $provide.value('calendarHomeService', {
        getUserCalendarHomeId: function() {
          return $q.when(calendarHomeId);
        }
      });

      $provide.value('esnSearchProvider', esnSearchProvider);
      $provide.value('Cache', function() {});
    });
  });

  beforeEach(inject(function(_$rootScope_, _$httpBackend_, _calSearchEventProviderService_, _calendarService_, _calEventService_, _CAL_ADVANCED_SEARCH_CALENDAR_TYPES_) {
    $rootScope = _$rootScope_;
    calSearchEventProviderService = _calSearchEventProviderService_;
    $httpBackend = _$httpBackend_;
    calendarService = _calendarService_;
    calEventService = _calEventService_;
    CAL_ADVANCED_SEARCH_CALENDAR_TYPES = _CAL_ADVANCED_SEARCH_CALENDAR_TYPES_;
  }));

  it('should build a provider which is able to do a basic search for events from each calendar, return aggregated results having date prop', function(done) {
    var calendarIds = ['calendar1', 'calendar2'];
    var davCalendars = calendarIds.map(function(calendarId) {
      return {
        _links: {
          self: { href: '/calendars/' + calendarHomeId + '/' + calendarId + '.json'}
        }
      };
    });

    $httpBackend.expectGET('/dav/api/calendars/' + calendarHomeId + '.json?personal=true&sharedDelegationStatus=accepted&sharedPublicSubscription=true&withRights=true').respond(200, {
      _embedded: {
        'dav:calendar': davCalendars
      }
    });

    calSearchEventProviderService()
      .then(assertThatRegisteredProviderTriggersDAVRequests);

    $rootScope.$digest();
    $httpBackend.flush();

    function assertThatRegisteredProviderTriggersDAVRequests(provider) {
      provider.options.fetch({ text: 'abcd' })()
        .then(assertOnAggregatedResults)
        .then(done);

      function davReferences(calendarId) {
        return {
          self: { href: '/prepath/path/to/' + calendarId + '/myuid.ics' }
        };
      }
      function fakeDAVResults(calendarId) {
        return [{
          _links: davReferences(calendarId),
          etag: '"123123"',
          data: 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nEND:VEVENT\r\nEND:VCALENDAR'
        }];
      }

      calendarIds.forEach(function(calendarId) {
        $httpBackend.expectGET('/calendar/api/calendars/' + calendarHomeId + '/' + calendarId + '/events.json?limit=200&offset=0&query=abcd').respond(200, {
          _links: davReferences(calendarId),
          _embedded: {
            'dav:item': fakeDAVResults(calendarId)
          }
        });
      });

      function assertOnAggregatedResults(events) {
        expect(events.length).to.equal(calendarIds.length);
        events.forEach(function(event) {
          expect(event).to.have.ownProperty('date');
        });
      }
    }
  });

  it('should prevent error when sabre is down', function(done) {
    calendarService.listPersonalAndAcceptedDelegationCalendars = function() { return $q.reject(); };

    calSearchEventProviderService()
      .then(function(provider) {
        provider.options.fetch('abcd')()
          .catch(done);
      });
    $rootScope.$digest();
  });

  describe('the fetch fn', function() {
    var mockCalendars = [{
      id: 'id1',
      href: 'href1',
      isSubscription: function() { return false; },
      isOwner: function() { return true; }
    }, {
      id: 'id2',
      href: 'href2',
      isSubscription: function() { return true; },
      isShared: function() { return true; }, // delegated calendar
      isOwner: function() { return false; },
      source: {
        id: 'ida',
        href: 'hrefa'
      }
    }, {
      id: 'id3',
      href: 'href3',
      isSubscription: function() { return true; },
      isShared: function() { return false; }, // public calendar
      isOwner: function() { return false; },
      source: {
        id: 'idb',
        href: 'hrefb'
      }
    }];

    var mockEvents = [
      {
        id: 'event1',
        calendarId: 'id1',
        start: 'Wed Apr 17 2019 14:58:24 GMT+0700',
        supposedUserCalendar: mockCalendars[0]
      },
      {
        id: 'event2',
        calendarId: 'id1',
        start: 'Wed Apr 17 2019 14:58:25 GMT+0700',
        supposedUserCalendar: mockCalendars[0]
      },
      {
        id: 'event3',
        calendarId: 'ida',
        start: 'Wed Apr 17 2019 14:58:26 GMT+0700',
        supposedUserCalendar: mockCalendars[1]
      },
      {
        id: 'event4',
        calendarId: 'idb',
        start: 'Wed Apr 17 2019 14:58:22 GMT+0700',
        supposedUserCalendar: mockCalendars[2]
      }
    ];

    var myCalendarEvents = [mockEvents[0], mockEvents[1]];
    var sharedCalendarEvents = [mockCalendars[2], mockEvents[3]];

    var query = {
      advanced: {
        contains: 'king',
        organizers: mockUsers,
        attendees: [mockUsers[0]]
      }
    };

    beforeEach(function() {
      sinon.stub(calEventService, 'searchEventsBasic', function() {
        return $q.when([]);
      });

      sinon.stub(calendarService, 'listPersonalAndAcceptedDelegationCalendars', function() {
        return $q.when(mockCalendars);
      });
    });

    it('should not call #calEventService.searchEventsAdvanced when there are no advanced options provided', function(done) {
      calEventService.searchEventsAdvanced = sinon.spy(function() {
        return $q.when([]);
      });

      calSearchEventProviderService()
        .then(function(provider) {
          provider.options.fetch({ text: 'king' })()
            .then(function() {
              expect(calEventService.searchEventsAdvanced).to.have.not.been.called;
              done();
            })
            .catch(function(err) {
              done(err || new Error('should not happen'));
            });
        });

      $rootScope.$digest();
    });

    it('should not call #calEventService.searchEventsAdvanced when there are no calendars provided in the advanced options', function(done) {
      calEventService.searchEventsAdvanced = sinon.spy(function() {
        return $q.when([]);
      });

      calSearchEventProviderService()
        .then(function(provider) {
          provider.options.fetch({ advanced: { contains: 'king' } })()
            .then(function() {
              expect(calEventService.searchEventsAdvanced).to.have.not.been.called;
              done();
            })
            .catch(function(err) {
              done(err || new Error('should not happen'));
            });
        });

      $rootScope.$digest();
    });

    it('should call #calEventService.searchEventsAdvanced with good params including all calendars and return events with correct properties', function(done) {
      calEventService.searchEventsAdvanced = sinon.spy(function() {
        return $q.when(mockEvents);
      });

      query.advanced.cal = CAL_ADVANCED_SEARCH_CALENDAR_TYPES.ALL_CALENDARS;

      calSearchEventProviderService()
        .then(function(provider) {
          provider.options.fetch(query)()
            .then(function(events) {
              expect(calEventService.searchEventsAdvanced).to.have.been.calledWith(sinon.match({
                query: query,
                userId: calendarHomeId,
                calendars: mockCalendars
              }));
              expect(events.length).to.equal(mockEvents.length);
              events.forEach(function(event) {
                expect(event.calendar).to.equal(event.supposedUserCalendar);
                expect(event.date).to.equal(event.start);
              });
              done();
            })
            .catch(function(err) {
              done(err || new Error('should not happen'));
            });
        });

      $rootScope.$digest();
    });

    it('should call #calEventService.searchEventsAdvanced with good params including only my calendars and return events with correct properties', function(done) {
      calEventService.searchEventsAdvanced = sinon.spy(function() {
        return $q.when(myCalendarEvents);
      });

      query.advanced.cal = CAL_ADVANCED_SEARCH_CALENDAR_TYPES.MY_CALENDARS;

      calSearchEventProviderService()
        .then(function(provider) {
          provider.options.fetch(query)()
            .then(function(events) {
              expect(calEventService.searchEventsAdvanced).to.have.been.calledWith(sinon.match({
                query: query,
                userId: calendarHomeId,
                calendars: [mockCalendars[0]]
              }));
              expect(events.length).to.equal(myCalendarEvents.length);
              events.forEach(function(event) {
                expect(event.calendar).to.equal(event.supposedUserCalendar);
                expect(event.date).to.equal(event.start);
              });
              done();
            })
            .catch(function(err) {
              done(err || new Error('should not happen'));
            });
        });

      $rootScope.$digest();
    });

    it('should call #calEventService.searchEventsAdvanced with good params including only shared calendars and return events with correct properties', function(done) {
      calEventService.searchEventsAdvanced = sinon.spy(function() {
        return $q.when(sharedCalendarEvents);
      });

      query.advanced.cal = CAL_ADVANCED_SEARCH_CALENDAR_TYPES.SHARED_CALENDARS;

      calSearchEventProviderService()
        .then(function(provider) {
          provider.options.fetch(query)()
            .then(function(events) {
              expect(calEventService.searchEventsAdvanced).to.have.been.calledWith(sinon.match({
                query: query,
                userId: calendarHomeId,
                calendars: [mockCalendars[1], mockCalendars[2]]
              }));
              expect(events.length).to.equal(sharedCalendarEvents.length);
              events.forEach(function(event) {
                expect(event.calendar).to.equal(event.supposedUserCalendar);
                expect(event.date).to.equal(event.start);
              });
              done();
            })
            .catch(function(err) {
              done(err || new Error('should not happen'));
            });
        });

      $rootScope.$digest();
    });

    it('should call #calEventService.searchEventsAdvanced with good params including only a specific calendar and return events with correct properties', function(done) {
      calEventService.searchEventsAdvanced = sinon.spy(function() {
        return $q.when(myCalendarEvents);
      });

      query.advanced.cal = mockCalendars[0].id;

      calSearchEventProviderService()
        .then(function(provider) {
          provider.options.fetch(query)()
            .then(function(events) {
              expect(calEventService.searchEventsAdvanced).to.have.been.calledWith(sinon.match({
                query: query,
                userId: calendarHomeId,
                calendars: [mockCalendars[0]]
              }));
              expect(events.length).to.equal(myCalendarEvents.length);
              events.forEach(function(event) {
                expect(event.calendar).to.equal(event.supposedUserCalendar);
                expect(event.date).to.equal(event.start);
              });
              done();
            })
            .catch(function(err) {
              done(err || new Error('should not happen'));
            });
        });

      $rootScope.$digest();
    });
  });

  describe('the cleanQuery fn', function() {
    var query = {
      advanced: {
        contains: 'king',
        organizers: [],
        attendees: []
      }
    };

    it('should clean empty organizers and attendees options', function(done) {
      calSearchEventProviderService()
        .then(function(provider) {
          var cleanedQuery = provider.options.cleanQuery(query);

          expect(cleanedQuery).to.deep.equal({
            advanced: {
              contains: 'king'
            }
          });

          done();
        });

      $rootScope.$digest();
    });

    it('should keep only needed properties from entity objects', function(done) {
      query.advanced.organizers = [mockUsers[0]];
      query.advanced.attendees = mockUsers;

      calSearchEventProviderService()
        .then(function(provider) {
          var cleanedQuery = provider.options.cleanQuery(query);

          expect(cleanedQuery).to.deep.equal({
            advanced: {
              contains: 'king',
              organizers: [
                {
                  email: 'user1@mail.com',
                  displayName: 'User1'
                }
              ],
              attendees: [
                {
                  email: 'user1@mail.com',
                  displayName: 'User1'
                },
                {
                  email: 'user2@mail.com',
                  displayName: 'User2'
                }
              ]
            }
          });

          done();
        });

      $rootScope.$digest();
    });
  });
});
