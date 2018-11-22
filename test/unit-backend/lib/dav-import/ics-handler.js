'use strict';

const mockery = require('mockery');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;

describe('The calendar backend/lib/dav-import/ics-handler module', function() {
  let getModule, davEndpoint, token, davServerMock, authMock;

  beforeEach(function() {
    davEndpoint = 'http://davendpoint:8003';
    token = 'aToken';
  });

  beforeEach(function() {

    authMock = {
      token: {
        getNewToken: sinon.spy(function(opts, callback) {
          return callback(null, { token: token });
        })
      }
    };

    davServerMock = {
      utils: {
        getDavEndpoint: sinon.spy(function(callback) {
          return callback(davEndpoint);
        })
      }
    };

    this.moduleHelpers.addDep('auth', authMock);
    this.moduleHelpers.addDep('davserver', davServerMock);
    getModule = () => require('../../../../backend/lib/dav-import/ics-handler')(this.moduleHelpers.dependencies);
  });

  describe('The readLines fn', function() {
    it('should return complete vcalendar items and remaining lines', function() {
      const lines = [
        'BEGIN:VCALENDAR',
        'PRODID:-//Aliasource Groupe LINAGORA//OBM Calendar 3.1.5-rc4//FR',
        'CALSCALE:GREGORIAN',
        'X-OBM-TIME:1434093633',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        'CREATED:20150612T072032Z',
        'LAST-MODIFIED:20150612T072032Z',
        'DTSTAMP:20150612T072032Z',
        'DTSTART:20150612T130000Z',
        'DURATION:PT30M',
        'TRANSP:OPAQUE',
        'SEQUENCE:0',
        'SUMMARY:Démo OPENPAAS',
        'DESCRIPTION:Présentation de OPENPAAS',
        'CLASS:PUBLIC',
        'PRIORITY:5',
        'ORGANIZER;X-OBM-ID=302;CN=organizerFirstName organizerLastName:MAILTO:organizer@open-paas.org',
        'X-OBM-DOMAIN:linagora.com',
        'X-OBM-DOMAIN-UUID:02874f7c-d10e-102f-acda-0015176f7922',
        'LOCATION:https://hubl.in/openpaas',
        'CATEGORIES:',
        'X-OBM-COLOR:',
        'UID:f1514f44bf39311568d640721cbc555071ca90e08d3349ccae43e1787553988ae047fe',
        'b2aab16e43439a608f28671ab7c10e754cec5324c4e4cd93f443dc3934f6c5d2e592a8112c',
        'ATTENDEE;CUTYPE=INDIVIDUAL;RSVP=TRUE;CN=organizerFirstName organizerLastName;PARTSTAT=ACC',
        'EPTED;X-OBM-ID=302:mailto:organizer@open-paas.org',
        'ATTENDEE;CUTYPE=INDIVIDUAL;RSVP=TRUE;CN=attendee1Firstname attendee1Lastname;PARTSTAT=ACC',
        'EPTED;X-OBM-ID=303:mailto:attendee1@open-paas.org',
        'ATTENDEE;CUTYPE=INDIVIDUAL;RSVP=TRUE;CN=attendee2Firstname attendee2Lastname;PARTSTAT=NEEDS-',
        'ACTION;X-OBM-ID=399:mailto:attendee2@open-paas.org',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'CREATED:20150612T072032Z',
        'LAST-MODIFIED:20150612T072032Z',
        'DTSTAMP:20150612T072032Z'
      ];

      const { items, remainingLines } = getModule().readLines(lines);

      expect(items).to.have.length(1);
      expect(remainingLines).to.have.length(4);
    });

    it('should skip lines until the start line if there is not remaining lines', function() {
      const lines = [
        'these',
        'lines',
        'must',
        'be',
        'ignored',
        'BEGIN:VCALENDAR',
        'PRODID:-//Aliasource Groupe LINAGORA//OBM Calendar 3.1.5-rc4//FR',
        'CALSCALE:GREGORIAN',
        'X-OBM-TIME:1434093633',
        'VERSION:2.0',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        'CREATED:20150612T072032Z',
        'LAST-MODIFIED:20150612T072032Z',
        'DTSTAMP:20150612T072032Z',
        'DTSTART:20150612T130000Z',
        'DURATION:PT30M',
        'TRANSP:OPAQUE',
        'SEQUENCE:0',
        'SUMMARY:Démo OPENPAAS',
        'DESCRIPTION:Présentation de OPENPAAS',
        'CLASS:PUBLIC',
        'PRIORITY:5',
        'ORGANIZER;X-OBM-ID=302;CN=organizerFirstName organizerLastName:MAILTO:organizer@open-paas.org',
        'X-OBM-DOMAIN:linagora.com',
        'X-OBM-DOMAIN-UUID:02874f7c-d10e-102f-acda-0015176f7922',
        'LOCATION:https://hubl.in/openpaas',
        'CATEGORIES:',
        'X-OBM-COLOR:',
        'UID:f1514f44bf39311568d640721cbc555071ca90e08d3349ccae43e1787553988ae047fe',
        'b2aab16e43439a608f28671ab7c10e754cec5324c4e4cd93f443dc3934f6c5d2e592a8112c',
        'ATTENDEE;CUTYPE=INDIVIDUAL;RSVP=TRUE;CN=organizerFirstName organizerLastName;PARTSTAT=ACC',
        'EPTED;X-OBM-ID=302:mailto:organizer@open-paas.org',
        'ATTENDEE;CUTYPE=INDIVIDUAL;RSVP=TRUE;CN=attendee1Firstname attendee1Lastname;PARTSTAT=ACC',
        'EPTED;X-OBM-ID=303:mailto:attendee1@open-paas.org',
        'ATTENDEE;CUTYPE=INDIVIDUAL;RSVP=TRUE;CN=attendee2Firstname attendee2Lastname;PARTSTAT=NEEDS-',
        'ACTION;X-OBM-ID=399:mailto:attendee2@open-paas.org',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'CREATED:20150612T072032Z',
        'LAST-MODIFIED:20150612T072032Z',
        'DTSTAMP:20150612T072032Z'
      ];

      const { items, remainingLines } = getModule().readLines(lines);

      expect(items).to.have.length(1);
      expect(remainingLines).to.have.length(4);
    });

    it('should take remaining lines into account', function() {
      const lines = [
        'DESCRIPTION:Présentation de OPENPAAS',
        'CLASS:PUBLIC',
        'PRIORITY:5',
        'ORGANIZER;X-OBM-ID=302;CN=organizerFirstName organizerLastName:MAILTO:organizer@open-paas.org',
        'X-OBM-DOMAIN:linagora.com',
        'X-OBM-DOMAIN-UUID:02874f7c-d10e-102f-acda-0015176f7922',
        'LOCATION:https://hubl.in/openpaas',
        'CATEGORIES:',
        'X-OBM-COLOR:',
        'UID:f1514f44bf39311568d640721cbc555071ca90e08d3349ccae43e1787553988ae047fe',
        'b2aab16e43439a608f28671ab7c10e754cec5324c4e4cd93f443dc3934f6c5d2e592a8112c',
        'ATTENDEE;CUTYPE=INDIVIDUAL;RSVP=TRUE;CN=organizerFirstName organizerLastName;PARTSTAT=ACC',
        'EPTED;X-OBM-ID=302:mailto:organizer@open-paas.org',
        'ATTENDEE;CUTYPE=INDIVIDUAL;RSVP=TRUE;CN=attendee1Firstname attendee1Lastname;PARTSTAT=ACC',
        'EPTED;X-OBM-ID=303:mailto:attendee1@open-paas.org',
        'ATTENDEE;CUTYPE=INDIVIDUAL;RSVP=TRUE;CN=attendee2Firstname attendee2Lastname;PARTSTAT=NEEDS-',
        'ACTION;X-OBM-ID=399:mailto:attendee2@open-paas.org',
        'END:VEVENT'
      ];

      const remainingLines = [
        'BEGIN:VEVENT',
        'CREATED:20150612T072032Z',
        'LAST-MODIFIED:20150612T072032Z',
        'DTSTAMP:20150612T072032Z',
        'DTSTART:20150612T130000Z',
        'DURATION:PT30M',
        'TRANSP:OPAQUE',
        'SEQUENCE:0',
        'SUMMARY:Démo OPENPAAS'
      ];

      const { items } = getModule().readLines(lines, remainingLines);

      expect(items).to.have.length(1);
    });

    it('should work well with \\r character at the end of the line', function() {
      const lines = [
        'BEGIN:VCALENDAR\r',
        'PRODID:-//Aliasource Groupe LINAGORA//OBM Calendar 3.1.5-rc4//FR\r',
        'CALSCALE:GREGORIAN\r',
        'X-OBM-TIME:1434093633\r',
        'VERSION:2.0\r',
        'METHOD:REQUEST\r',
        'BEGIN:VEVENT\r',
        'CREATED:20150612T072032Z\r',
        'LAST-MODIFIED:20150612T072032Z\r',
        'DTSTAMP:20150612T072032Z\r',
        'DTSTART:20150612T130000Z\r',
        'DURATION:PT30M\r',
        'TRANSP:OPAQUE\r',
        'SEQUENCE:0\r',
        'SUMMARY:Démo OPENPAAS\r',
        'DESCRIPTION:Présentation de OPENPAAS\r',
        'CLASS:PUBLIC\r',
        'PRIORITY:5\r',
        'ORGANIZER;X-OBM-ID=302;CN=organizerFirstName organizerLastName:MAILTO:organizer@open-paas.org\r',
        'X-OBM-DOMAIN:linagora.com\r',
        'X-OBM-DOMAIN-UUID:02874f7c-d10e-102f-acda-0015176f7922\r',
        'LOCATION:https://hubl.in/openpaas\r',
        'CATEGORIES:\r',
        'X-OBM-COLOR:\r',
        'UID:f1514f44bf39311568d640721cbc555071ca90e08d3349ccae43e1787553988ae047fe\r',
        'b2aab16e43439a608f28671ab7c10e754cec5324c4e4cd93f443dc3934f6c5d2e592a8112c\r',
        'ATTENDEE;CUTYPE=INDIVIDUAL;RSVP=TRUE;CN=organizerFirstName organizerLastName;PARTSTAT=ACC\r',
        'EPTED;X-OBM-ID=302:mailto:organizer@open-paas.org\r',
        'ATTENDEE;CUTYPE=INDIVIDUAL;RSVP=TRUE;CN=attendee1Firstname attendee1Lastname;PARTSTAT=ACC\r',
        'EPTED;X-OBM-ID=303:mailto:attendee1@open-paas.org\r',
        'ATTENDEE;CUTYPE=INDIVIDUAL;RSVP=TRUE;CN=attendee2Firstname attendee2Lastname;PARTSTAT=NEEDS-\r',
        'ACTION;X-OBM-ID=399:mailto:attendee2@open-paas.org\r',
        'END:VEVENT\r',
        'BEGIN:VEVENT\r',
        'CREATED:20150612T072032Z\r',
        'LAST-MODIFIED:20150612T072032Z\r',
        'DTSTAMP:20150612T072032Z'
      ];

      const { items, remainingLines } = getModule().readLines(lines);

      expect(items).to.have.length(1);
      expect(remainingLines).to.have.length(4);
    });
  });

  describe('The importItem fn', function() {
    let clientMock;

    beforeEach(function() {
      clientMock = sinon.stub();

      mockery.registerMock('../caldav-client', () => clientMock);
    });

    it('should reject when target is not a valid address book path', function(done) {
      const item = [
        'BEGIN:VEVENT',
        'CREATED:20150612T072032Z',
        'LAST-MODIFIED:20150612T072032Z',
        'DTSTAMP:20150612T072032Z',
        'DTSTART:20150612T130000Z',
        'DURATION:PT30M',
        'TRANSP:OPAQUE',
        'SEQUENCE:0',
        'SUMMARY:Démo OPENPAAS',
        'DESCRIPTION:Présentation de OPENPAAS',
        'CLASS:PUBLIC',
        'PRIORITY:5',
        'ORGANIZER;X-OBM-ID=302;CN=organizerFirstName organizerLastName:MAILTO:organizer@open-paas.org',
        'UID:f1514f44bf39311568d640721cbc555071ca90e08d3349ccae43e1787553988ae047fe',
        'b2aab16e43439a608f28671ab7c10e754cec5324c4e4cd93f443dc3934f6c5d2e592a8112c',
        'ATTENDEE;CUTYPE=INDIVIDUAL;RSVP=TRUE;CN=organizerFirstName organizerLastName;PARTSTAT=ACC',
        'EPTED;X-OBM-ID=302:mailto:organizer@open-paas.org',
        'END:VEVENT'
      ].join('\n');
      const target = '/calendar/';

      getModule().importItem(item, { target })
        .then()
        .catch(err => {
          expect(err.message).to.equal(`${target} is not a valid calendar path`);
          done();
        });
    });

    it('should call dav client to put events if the user is organizer', function(done) {
      const item = [
        'BEGIN:VEVENT',
        'CREATED:20150612T072032Z',
        'LAST-MODIFIED:20150612T072032Z',
        'DTSTAMP:20150612T072032Z',
        'DTSTART:20150612T130000Z',
        'DURATION:PT30M',
        'TRANSP:OPAQUE',
        'SEQUENCE:0',
        'SUMMARY:Démo OPENPAAS',
        'DESCRIPTION:Présentation de OPENPAAS',
        'CLASS:PUBLIC',
        'PRIORITY:5',
        'ORGANIZER:mailto:user1@test.test',
        'UID:123456789',
        'END:VEVENT'
      ].join('\n');

      const user = {
        _id: '123',
        preferredEmail: 'user1@test.test'
      };
      const calendarId = '123';
      const target = `/calendar/userId/${calendarId}.json`;

      clientMock = {
        importEvent: sinon.spy(() => Promise.resolve(true))
      };

      getModule().importItem(item, { target, user })
        .then(res => {
          expect(clientMock.importEvent).to.have.been.called;
          expect(res).to.be.true;
          done();
        }, err => done(err)).catch(done);
    });

    it('should call dav client to put events if the user is attendee', function(done) {
      const item = [
        'BEGIN:VEVENT',
        'CREATED:20150612T072032Z',
        'LAST-MODIFIED:20150612T072032Z',
        'DTSTAMP:20150612T072032Z',
        'DTSTART:20150612T130000Z',
        'DURATION:PT30M',
        'TRANSP:OPAQUE',
        'SEQUENCE:0',
        'SUMMARY:Démo OPENPAAS',
        'DESCRIPTION:Présentation de OPENPAAS',
        'CLASS:PUBLIC',
        'PRIORITY:5',
        'ORGANIZER;X-OBM-ID=302;CN=organizerFirstName organizerLastName:MAILTO:organizer@open-paas.org',
        'UID:f1514f44bf39311568d640721cbc555071ca90e08d3349ccae43e1787553988ae047fe',
        'ATTENDEE;CUTYPE=INDIVIDUAL;RSVP=TRUE;CN=organizerFirstName organizerLastName;PARTSTAT=ACCEPTED;X-OBM-ID=302:mailto:organizer@open-paas.org',
        'ATTENDEE;CUTYPE=INDIVIDUAL;RSVP=TRUE;CN=user1 user1;PARTSTAT=NEED-ACTION;X-OBM-ID=302:mailto:user1@test.test',
        'END:VEVENT'
      ].join('\n');

      const user = {
        _id: '123',
        preferredEmail: 'user1@test.test'
      };
      const calendarId = '123';
      const target = `/calendar/userId/${calendarId}.json`;

      clientMock = {
        importEvent: sinon.spy(() => Promise.resolve(true))
      };

      getModule().importItem(item, { target, user })
        .then(res => {
          expect(clientMock.importEvent).to.have.been.called;
          expect(res).to.be.true;
          done();
        }, err => done(err)).catch(done);
    });

    it('should not call dav client to put events if the user is not the organizer or a attendee', function(done) {
      const item = [
        'BEGIN:VEVENT',
        'CREATED:20150612T072032Z',
        'LAST-MODIFIED:20150612T072032Z',
        'DTSTAMP:20150612T072032Z',
        'DTSTART:20150612T130000Z',
        'DURATION:PT30M',
        'TRANSP:OPAQUE',
        'SEQUENCE:0',
        'SUMMARY:Démo OPENPAAS',
        'DESCRIPTION:Présentation de OPENPAAS',
        'CLASS:PUBLIC',
        'PRIORITY:5',
        'ORGANIZER;X-OBM-ID=302;CN=organizerFirstName organizerLastName:MAILTO:organizer@open-paas.org',
        'UID:f1514f44bf39311568d640721cbc555071ca90e08d3349ccae43e1787553988ae047fe',
        'ATTENDEE;CUTYPE=INDIVIDUAL;RSVP=TRUE;CN=organizerFirstName organizerLastName;PARTSTAT=ACCEPTED;X-OBM-ID=302:mailto:organizer@open-paas.org',
        'END:VEVENT'
      ].join('\n');

      const user = {
        _id: '123',
        preferredEmail: 'user1@test.test'
      };
      const calendarId = '123';
      const target = `/calendar/userId/${calendarId}.json`;

      clientMock = {
        importEvent: sinon.spy(() => Promise.resolve(true))
      };

      getModule().importItem(item, { target, user })
        .then(() => {
          expect(clientMock.importEvent).to.not.have.been.called;
          done();
        }, err => done(err)).catch(done);
    });
  });
});
