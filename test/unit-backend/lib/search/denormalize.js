'use strict';

var expect = require('chai').expect;
var fs = require('fs-extra');

describe('search helpers', function() {

  beforeEach(function() {
    this.calendarModulePath = this.moduleHelpers.modulePath;
    this.denormalize = require(this.calendarModulePath + '/backend/lib/search/denormalize');
  });

  describe('The denormalize function', function() {
    var data, ics;

    it('should parse jcal formatted event and return a pruned content for the email', function() {
      ics = fs.readFileSync(this.calendarModulePath + '/test/unit-backend/fixtures/meeting.ics').toString('utf8');
      data = {
        ics: ics,
        userId: 'userId',
        uid: 'uid',
        calendarId: 'calendarId'
      };

      expect(this.denormalize.denormalize(data)).to.deep.equal({
        summary: 'Démo OPENPAAS',
        userId: 'userId',
        calendarId: 'calendarId',
        uid: 'f1514f44bf39311568d640721cbc555071ca90e08d3349ccae43e1787553988ae047feb2aab16e43439a608f28671ab7c10e754cec5324c4e4cd93f443dc3934f6c5d2e592a8112c',
        start: '2015-06-12T13:00:00.000Z',
        end: '2015-06-12T13:30:00.000Z',
        dtstamp: '2015-06-12T07:20:32.000Z',
        allDay: false,
        durationInDays: 0,
        location: 'https://hubl.in/openpaas',
        description: 'Présentation de OPENPAAS',
        organizer: {
          cn: 'John Doe',
          email: 'johndoe@open-paas.org'
        },
        attendees: [{
          email: 'johndoe@open-paas.org',
          cn: 'John Doe'
        }, {
          email: 'janedoe@open-paas.org',
          cn: 'Jane Doe'
        }, {
          email: 'babydoe@open-paas.org',
          cn: 'Baby Doe'
        }],
        class: 'PUBLIC',
        resources: [],
        hasResources: false
      });
    });

    it('should correctly parse date with a specified timezone', function() {
      ics = fs.readFileSync(this.calendarModulePath + '/test/unit-backend/fixtures/meeting-tzid.ics').toString('utf8');
      data = {
        ics: ics,
        userId: 'userId',
        uid: 'uid',
        calendarId: 'calendarId'
      };
      expect(this.denormalize.denormalize(data)).to.shallowDeepEqual({
        start: '2015-06-12T17:00:00.000Z',
        end: '2015-06-12T17:30:00.000Z'
      });
    });

    it('should correctly parse date with different specified timezone for start and end', function() {
      ics = fs.readFileSync(this.calendarModulePath + '/test/unit-backend/fixtures/flight-event.ics').toString('utf8');
      data = {
        ics: ics,
        userId: 'userId',
        uid: 'uid',
        calendarId: 'calendarId'
      };
      expect(this.denormalize.denormalize(data)).to.shallowDeepEqual({
        start: '2015-06-12T17:00:00.000Z',
        end: '2015-06-12T15:00:00.000Z'
      });
    });

    it.skip('should correctly parse floating date by dealing them as utc date', function() {
      ics = fs.readFileSync(this.calendarModulePath + '/test/unit-backend/fixtures/meeting-floating.ics').toString('utf8');
      data = {
        ics: ics,
        userId: 'userId',
        uid: 'uid',
        calendarId: 'calendarId'
      };
      expect(this.denormalize.denormalize(data)).to.shallowDeepEqual({
        start: '2015-06-12T13:00:00.000Z',
        end: '2015-06-12T13:30:00.000Z'
      });
    });

    it('should parse jcal formatted event using the cancel method', function() {
      ics = fs.readFileSync(this.calendarModulePath + '/test/unit-backend/fixtures/cancel-event.ics').toString('utf8');
      data = {
        ics: ics,
        userId: 'userId',
        uid: 'uid',
        calendarId: 'calendarId'
      };
      expect(this.denormalize.denormalize(data)).to.deep.equal({
        summary: 'Démo OPENPAAS',
        uid: 'f1514f44bf39311568d640721cbc555071ca90e08d3349ccae43e1787553988ae047feb2aab16e43439a608f28671ab7c10e754cec5324c4e4cd93f443dc3934f6c5d2e592a8112c',
        userId: 'userId',
        calendarId: 'calendarId',
        start: '2015-06-12T13:00:00.000Z',
        end: '2015-06-12T14:00:00.000Z',
        dtstamp: '2015-06-12T07:20:32.000Z',
        allDay: false,
        durationInDays: 0,
        location: 'https://hubl.in/openpaas',
        description: 'Présentation de OPENPAAS',
        organizer: {
          email: 'johndoe@open-paas.org',
          cn: 'John Doe'
        },
        attendees: [{
          email: 'johndoe@open-paas.org',
          cn: 'John Doe'
        }, {
          email: 'janedoe@open-paas.org',
          cn: 'Jane Doe'
        }],
        class: 'PUBLIC',
        resources: [],
        hasResources: false
      });
    });

    it('should parse jcal formatted allDay event', function() {
      ics = fs.readFileSync(this.calendarModulePath + '/test/unit-backend/fixtures/allday.ics').toString('utf8');
      data = {
        ics: ics,
        userId: 'userId',
        uid: 'uid',
        calendarId: 'calendarId'
      };
      expect(this.denormalize.denormalize(data)).to.shallowDeepEqual({
        summary: 'Démo OPENPAAS',
        uid: 'f1514f44bf39311568d640721cbc555071ca90e08d3349ccae43e1787553988ae047feb2aab16e43439a608f28671ab7c10e754cec5324c4e4cd93f443dc3934f6c5d2e592a8112c',
        start: '2015-06-12T00:00:00.000Z',
        userId: 'userId',
        calendarId: 'calendarId',
        end: '2015-09-12T00:00:00.000Z',
        allDay: true,
        durationInDays: 92,
        location: 'https://hubl.in/openpaas',
        description: 'Présentation de OPENPAAS',
        organizer: {
          cn: 'John Doe',
          email: 'johndoe@open-paas.org'
        },
        attendees: [{
          email: 'johndoe@open-paas.org',
          cn: 'John Doe'
        }, {
          email: 'janedoe@open-paas.org',
          cn: 'Jane Doe'
        }]
      });
    });

    it('should ignore valarm component', function() {
      ics = fs.readFileSync(this.calendarModulePath + '/test/unit-backend/fixtures/withVALARM.ics').toString('utf8');
      data = {
        ics: ics,
        userId: 'userId',
        uid: 'uid',
        calendarId: 'calendarId'
      };
      expect(this.denormalize.denormalize(data)).to.shallowDeepEqual({
        summary: 'Démo OPENPAAS',
        uid: 'f1514f44bf39311568d640721cbc555071ca90e08d3349ccae43e1787553988ae047feb2aab16e43439a608f28671ab7c10e754cec5324c4e4cd93f443dc3934f6c5d2e592a8112c',
        start: '2115-06-12T00:00:00.000Z',
        end: '2115-09-12T00:00:00.000Z',
        allDay: true,
        durationInDays: 92,
        location: 'https://hubl.in/openpaas',
        description: 'Présentation de OPENPAAS',
        organizer: {
          cn: 'John Doe',
          email: 'johndoe@open-paas.org'
        },
        attendees: [{
          email: 'johndoe@open-paas.org',
          cn: 'John Doe'
        }, {
          email: 'janedoe@open-paas.org',
          cn: 'Jane Doe'
        }]
      });
    });

    it('should parse jcal formatted event when the event contain resource', function() {
      ics = fs.readFileSync(`${this.calendarModulePath}/test/unit-backend/fixtures/withResources.ics`).toString('utf8');
      data = {
        ics: ics,
        userId: 'userId',
        uid: 'uid',
        calendarId: 'calendarId'
      };
      expect(this.denormalize.denormalize(data)).to.shallowDeepEqual({
        attendees: [{
          email: 'johndoe@open-paas.org',
          cn: 'John Doe'
        }],
        resources: [{
          email: 'janedoe@open-paas.org',
          cn: 'Jane Doe'
        }]
      });
    });

    it('should correctly parse a recurrent master event', function() {
      ics = fs.readFileSync(this.calendarModulePath + '/test/unit-backend/fixtures/meeting-recurring-with-exception.ics').toString();
      data = {
        ics,
        userId: 'userId',
        uid: 'uid',
        calendarId: 'calendarId'
      };

      const denormalizedEvent = this.denormalize.denormalize(data);

      expect(denormalizedEvent.isRecurrentMaster).to.be.true;
      expect(denormalizedEvent.uid).to.equal('20e85629-f78f-4c4a-92ff-bd952b98b2fb');
      expect(denormalizedEvent.recurrenceId).to.not.exist;
      expect(denormalizedEvent.start).to.equal('2016-05-26T17:00:00.000Z');
      expect(denormalizedEvent.end).to.equal('2016-05-26T18:00:00.000Z');
      expect(denormalizedEvent.organizer.email).to.equal('admin@open-paas.org');
      expect(denormalizedEvent.attendees[0].email).to.equal('admin@open-paas.org');
      expect(denormalizedEvent.attendees[1].email).to.equal('user1@open-paas.org');
    });

    it('should correctly parse a recurrent exception', function() {
      ics = fs.readFileSync(this.calendarModulePath + '/test/unit-backend/fixtures/meeting-recurring-with-exception.ics').toString();
      data = {
        ics,
        userId: 'userId',
        uid: 'uid',
        calendarId: 'calendarId',
        recurrenceId: '2016-05-27T17:00:00Z'
      };

      const denormalizedEvent = this.denormalize.denormalize(data);

      expect(denormalizedEvent.isRecurrentMaster).to.be.undefined;
      expect(denormalizedEvent.uid).to.equal('20e85629-f78f-4c4a-92ff-bd952b98b2fb');
      expect(denormalizedEvent.recurrenceId).to.equal(data.recurrenceId);
      expect(denormalizedEvent.start).to.equal('2016-05-27T16:00:00.000Z');
      expect(denormalizedEvent.end).to.equal('2016-05-27T17:00:00.000Z');
      expect(denormalizedEvent.organizer.email).to.equal('admin@open-paas.org');
      expect(denormalizedEvent.attendees[0].email).to.equal('user1@open-paas.org');
      expect(denormalizedEvent.attendees[1].email).to.equal('lduzan@linagora.com');
      expect(denormalizedEvent.attendees[2].email).to.equal('admin@open-paas.org');
      expect(denormalizedEvent.attendees[3].email).to.equal('user2@open-paas.org');
    });
  });

  describe('The getId function', function() {
  });

  describe('The getEventUidFromElasticsearchId function', function() {
  });
});
