const {expect} = require('chai');
const ICAL = require('@linagora/ical.js');
const moment = require('moment-timezone');

describe('The alarm utils module', function() {
  let module;

  const nextAlarm = '2017-12-21T12:55:00Z';
  const dtstart = '20171220T125500Z';
  const icalDTStart = 'TZID=Europe/Berlin:20171220T140000';
  const timezone = 'Europe/Berlin';

  beforeEach(function() {
    this.requireModule = () => require(this.moduleHelpers.modulePath + '/backend/lib/alarm/utils');
  });

  describe('The getNextAlarm function', function() {
    let alarm, vevent, valarm, vcalendar;

    beforeEach(function() {
      alarm = {
        action: 'EMAIL',
        eventPath: '/calendars/5a3a251a831aef0dddcc5379/5a3a251a831aef0dddcc5379/cb5a7819-574e-49e4-b7ab-154e4ee6a83a.ics',
        eventUid: 'cb5a7819-574e-49e4-b7ab-154e4ee6a83a',
        dueDate: new Date('2017-12-20T13:55:00+0100'),
        ics: `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Sabre//Sabre VObject 4.1.3//EN\r\nBEGIN:VTIMEZONE\r\nTZID:Europe/Berlin\r\nBEGIN:DAYLIGHT\r\nTZOFFSETFROM:+0100\r\nTZOFFSETTO:+0200\r\nTZNAME:CEST\r\nDTSTART:19700329T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\nEND:DAYLIGHT\r\nBEGIN:STANDARD\r\nTZOFFSETFROM:+0200\r\nTZOFFSETTO:+0100\r\nTZNAME:CET\r\nDTSTART:19701025T030000\r\nRRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\nEND:STANDARD\r\nEND:VTIMEZONE\r\nBEGIN:VEVENT\r\nUID:cb5a7819-574e-49e4-b7ab-154e4ee6a83a\r\nTRANSP:OPAQUE\r\nDTSTART;${icalDTStart}\r\nDTEND;TZID=Europe/Berlin:20171220T163000\r\nCLASS:PUBLIC\r\nSUMMARY:dd\r\nRRULE:FREQ=DAILY\r\nORGANIZER;CN=John2 Doe2:mailto:user2@open-paas.org\r\nATTENDEE;PARTSTAT=ACCEPTED;RSVP=FALSE;ROLE=CHAIR;CUTYPE=INDIVIDUAL:mailto:u\r\n ser2@open-paas.org\r\nDTSTAMP:20171220T134753Z\r\nBEGIN:VALARM\r\nTRIGGER:-PT5M\r\nACTION:EMAIL\r\nATTENDEE:mailto:user2@open-paas.org\r\nSUMMARY:dd\r\nDESCRIPTION:This is an automatic alarm sent by OpenPaas\\\\nThe event dd will\r\n  start an hour ago\\\\nstart: Wed Dec 20 2017 14:00:00 GMT+0100 \\\\nend: Wed D\r\n ec 20 2017 16:30:00 GMT+0100 \\\\nlocation:  \\\\nclass: PUBLIC \\\\n\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR`,
        attendee: 'user2@open-paas.org'
      };

      module = this.requireModule();
    });

    function loadData() {
      vcalendar = ICAL.Component.fromString(alarm.ics);
      vevent = vcalendar.getFirstSubcomponent('vevent');
      valarm = vevent.getFirstSubcomponent('valarm');
    }

    it('should return null when event is not recurring', function() {
      alarm.ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Sabre//Sabre VObject 4.1.3//EN\r\nBEGIN:VTIMEZONE\r\nTZID:Europe/Berlin\r\nBEGIN:DAYLIGHT\r\nTZOFFSETFROM:+0100\r\nTZOFFSETTO:+0200\r\nTZNAME:CEST\r\nDTSTART:19700329T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\nEND:DAYLIGHT\r\nBEGIN:STANDARD\r\nTZOFFSETFROM:+0200\r\nTZOFFSETTO:+0100\r\nTZNAME:CET\r\nDTSTART:19701025T030000\r\nRRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\nEND:STANDARD\r\nEND:VTIMEZONE\r\nBEGIN:VEVENT\r\nUID:cb5a7819-574e-49e4-b7ab-154e4ee6a83a\r\nTRANSP:OPAQUE\r\nDTSTART;${icalDTStart}\r\nDTEND;TZID=Europe/Berlin:20171220T163000\r\nCLASS:PUBLIC\r\nSUMMARY:dd\r\nORGANIZER;CN=John2 Doe2:mailto:user2@open-paas.org\r\nATTENDEE;PARTSTAT=ACCEPTED;RSVP=FALSE;ROLE=CHAIR;CUTYPE=INDIVIDUAL:mailto:u\r\n ser2@open-paas.org\r\nDTSTAMP:20171220T134753Z\r\nBEGIN:VALARM\r\nTRIGGER:-PT5M\r\nACTION:EMAIL\r\nATTENDEE:mailto:user2@open-paas.org\r\nSUMMARY:dd\r\nDESCRIPTION:This is an automatic alarm sent by OpenPaas\\\\nThe event dd will\r\n  start an hour ago\\\\nstart: Wed Dec 20 2017 14:00:00 GMT+0100 \\\\nend: Wed D\r\n ec 20 2017 16:30:00 GMT+0100 \\\\nlocation:  \\\\nclass: PUBLIC \\\\n\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR`;
      loadData();
      expect(module.getNextAlarm(vevent, valarm)).to.not.be.defined;
    });

    it('should return the next occurence', function() {
      loadData();
      expect(module.getNextAlarm(vevent, valarm)).to.equalDate(moment(nextAlarm).toDate());
    });

    it('should return the next occurence after the defined date', function() {
      const lastFire = moment(dtstart).tz(timezone).add(1, 'day').toDate();

      loadData();
      expect(module.getNextAlarm(vevent, valarm, lastFire)).to.equalDate(moment('2017-12-22T12:55:00Z').toDate());
    });

    it('should return the next occurence after exception when start date is the day before exception', function() {
      const lastFire = moment(dtstart).tz(timezone).add(1, 'day').toDate();

      alarm.ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Sabre//Sabre VObject 4.1.3//EN\r\nBEGIN:VTIMEZONE\r\nTZID:Europe/Berlin\r\nBEGIN:DAYLIGHT\r\nTZOFFSETFROM:+0100\r\nTZOFFSETTO:+0200\r\nTZNAME:CEST\r\nDTSTART:19700329T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\nEND:DAYLIGHT\r\nBEGIN:STANDARD\r\nTZOFFSETFROM:+0200\r\nTZOFFSETTO:+0100\r\nTZNAME:CET\r\nDTSTART:19701025T030000\r\nRRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\nEND:STANDARD\r\nEND:VTIMEZONE\r\nBEGIN:VEVENT\r\nUID:65fc530e-617f-428f-9bff-3fdfd617c51b\r\nTRANSP:OPAQUE\r\nDTSTART;${icalDTStart}\r\nDTEND;TZID=Europe/Berlin:20171220T163000\r\nCLASS:PUBLIC\r\nSUMMARY:Recur each day\\, one deleted exception\r\nRRULE:FREQ=DAILY\r\nORGANIZER;CN=John2 Doe2:mailto:user2@open-paas.org\r\nATTENDEE;PARTSTAT=ACCEPTED;RSVP=FALSE;ROLE=CHAIR;CUTYPE=INDIVIDUAL:mailto:u\r\n ser2@open-paas.org\r\nDTSTAMP:20171221T111217Z\r\nEXDATE:20171222T130000Z\r\nBEGIN:VALARM\r\nTRIGGER:-PT5M\r\nACTION:EMAIL\r\nATTENDEE:mailto:user2@open-paas.org\r\nSUMMARY:Recur each day\\, one deleted exception\r\nDESCRIPTION:This is an automatic alarm sent by OpenPaas\\\\nThe event Recur e\r\n ach day\\, one deleted exception will start in an hour\\\\nstart: Thu Dec 21 2\r\n 017 13:00:00 GMT+0100 \\\\nend: Thu Dec 21 2017 14:00:00 GMT+0100 \\\\nlocation\r\n :  \\\\nclass: PUBLIC \\\\n\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR`;
      loadData();
      expect(module.getNextAlarm(vevent, valarm, lastFire)).to.equalDate(moment('2017-12-23T12:55:00Z').toDate());
    });

    it('should return the next occurence after exception when lastFire is the exception date', function() {
      const lastFire = moment(dtstart).tz(timezone).add(2, 'day').toDate();

      alarm.ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Sabre//Sabre VObject 4.1.3//EN\r\nBEGIN:VTIMEZONE\r\nTZID:Europe/Berlin\r\nBEGIN:DAYLIGHT\r\nTZOFFSETFROM:+0100\r\nTZOFFSETTO:+0200\r\nTZNAME:CEST\r\nDTSTART:19700329T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\nEND:DAYLIGHT\r\nBEGIN:STANDARD\r\nTZOFFSETFROM:+0200\r\nTZOFFSETTO:+0100\r\nTZNAME:CET\r\nDTSTART:19701025T030000\r\nRRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\nEND:STANDARD\r\nEND:VTIMEZONE\r\nBEGIN:VEVENT\r\nUID:65fc530e-617f-428f-9bff-3fdfd617c51b\r\nTRANSP:OPAQUE\r\nDTSTART;${icalDTStart}\r\nDTEND;TZID=Europe/Berlin:20171220T163000\r\nCLASS:PUBLIC\r\nSUMMARY:Recur each day\\, one deleted exception\r\nRRULE:FREQ=DAILY\r\nORGANIZER;CN=John2 Doe2:mailto:user2@open-paas.org\r\nATTENDEE;PARTSTAT=ACCEPTED;RSVP=FALSE;ROLE=CHAIR;CUTYPE=INDIVIDUAL:mailto:u\r\n ser2@open-paas.org\r\nDTSTAMP:20171221T111217Z\r\nEXDATE:20171222T130000Z\r\nBEGIN:VALARM\r\nTRIGGER:-PT5M\r\nACTION:EMAIL\r\nATTENDEE:mailto:user2@open-paas.org\r\nSUMMARY:Recur each day\\, one deleted exception\r\nDESCRIPTION:This is an automatic alarm sent by OpenPaas\\\\nThe event Recur e\r\n ach day\\, one deleted exception will start in an hour\\\\nstart: Thu Dec 21 2\r\n 017 13:00:00 GMT+0100 \\\\nend: Thu Dec 21 2017 14:00:00 GMT+0100 \\\\nlocation\r\n :  \\\\nclass: PUBLIC \\\\n\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR`;
      loadData();
      expect(module.getNextAlarm(vevent, valarm, lastFire)).to.equalDate(moment('2017-12-23T12:55:00Z').toDate());
    });

    describe('On N occurences event', function() {
      let occurences;

      beforeEach(function() {
        occurences = 10;
        alarm.ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Sabre//Sabre VObject 4.1.3//EN\r\nBEGIN:VTIMEZONE\r\nTZID:Europe/Berlin\r\nBEGIN:DAYLIGHT\r\nTZOFFSETFROM:+0100\r\nTZOFFSETTO:+0200\r\nTZNAME:CEST\r\nDTSTART:19700329T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\nEND:DAYLIGHT\r\nBEGIN:STANDARD\r\nTZOFFSETFROM:+0200\r\nTZOFFSETTO:+0100\r\nTZNAME:CET\r\nDTSTART:19701025T030000\r\nRRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\nEND:STANDARD\r\nEND:VTIMEZONE\r\nBEGIN:VEVENT\r\nUID:0d1f47ae-1c57-46e8-bd96-3e3a7bc47fb6\r\nTRANSP:OPAQUE\r\nDTSTART;${icalDTStart}\r\nDTEND;TZID=Europe/Berlin:20171220T163000\r\nCLASS:PUBLIC\r\nSUMMARY:Repeat 10 times\r\nRRULE:FREQ=DAILY;COUNT=${occurences}\r\nORGANIZER;CN=John2 Doe2:mailto:user2@open-paas.org\r\nATTENDEE;PARTSTAT=ACCEPTED;RSVP=FALSE;ROLE=CHAIR;CUTYPE=INDIVIDUAL:mailto:u\r\n ser2@open-paas.org\r\nDTSTAMP:20171221T135145Z\r\nBEGIN:VALARM\r\nTRIGGER:-PT5M\r\nACTION:EMAIL\r\nATTENDEE:mailto:user2@open-paas.org\r\nSUMMARY:Repeat 10 times\r\nDESCRIPTION:This is an automatic alarm sent by OpenPaas\\\\nThe event Repeat \r\n 10 times will start a day ago\\\\nstart: Wed Dec 20 2017 14:00:00 GMT+0100 \\\\\r\n nend: Wed Dec 20 2017 16:30:00 GMT+0100 \\\\nlocation:  \\\\nclass: PUBLIC \\\\n\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR`;
        loadData();
      });

      it('should return last occurence when trying to get alarm on last occurence - 1', function() {
        const lastFire = moment(dtstart).tz(timezone).add(occurences - 1, 'day').toDate();

        expect(module.getNextAlarm(vevent, valarm, lastFire)).to.equalDate(moment('2017-12-30T12:55:00Z').toDate());
      });

      it('should return null when trying to get alarm on last occurence', function() {
        const lastFire = moment(dtstart).tz(timezone).add(occurences, 'day').toDate();

        expect(module.getNextAlarm(vevent, valarm, lastFire)).to.not.be.defined;
      });

      it('should return null when trying to get alarm after the last occurence', function() {
        const lastFire = moment(dtstart).tz(timezone).add(occurences + 1, 'day').toDate();

        expect(module.getNextAlarm(vevent, valarm, lastFire)).to.not.be.defined;
      });
    });

    describe('On recurrent until date event', function() {
      let until;

      beforeEach(function() {
        // OP frontend sets last day like day - 1hour
        until = '20171224T230000Z';
        alarm.ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Sabre//Sabre VObject 4.1.3//EN\r\nBEGIN:VTIMEZONE\r\nTZID:Europe/Berlin\r\nBEGIN:DAYLIGHT\r\nTZOFFSETFROM:+0100\r\nTZOFFSETTO:+0200\r\nTZNAME:CEST\r\nDTSTART:19700329T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\nEND:DAYLIGHT\r\nBEGIN:STANDARD\r\nTZOFFSETFROM:+0200\r\nTZOFFSETTO:+0100\r\nTZNAME:CET\r\nDTSTART:19701025T030000\r\nRRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\nEND:STANDARD\r\nEND:VTIMEZONE\r\nBEGIN:VEVENT\r\nUID:fb256587-4925-4bc9-81a5-2ce3076eb843\r\nTRANSP:OPAQUE\r\nDTSTART;${icalDTStart}\r\nDTEND;TZID=Europe/Berlin:20171220T163000\r\nCLASS:PUBLIC\r\nSUMMARY:Until 25/12\r\nRRULE:FREQ=DAILY;UNTIL=${until}\r\nORGANIZER;CN=John2 Doe2:mailto:user2@open-paas.org\r\nATTENDEE;PARTSTAT=ACCEPTED;RSVP=FALSE;ROLE=CHAIR;CUTYPE=INDIVIDUAL:mailto:u\r\n ser2@open-paas.org\r\nDTSTAMP:20171221T140953Z\r\nBEGIN:VALARM\r\nTRIGGER:-PT5M\r\nACTION:EMAIL\r\nATTENDEE:mailto:user2@open-paas.org\r\nSUMMARY:Until 25/12\r\nDESCRIPTION:This is an automatic alarm sent by OpenPaas\\\\nThe event Until 2\r\n 5/12 will start a day ago\\\\nstart: Wed Dec 20 2017 14:00:00 GMT+0100 \\\\nend\r\n : Wed Dec 20 2017 16:30:00 GMT+0100 \\\\nlocation:  \\\\nclass: PUBLIC \\\\n\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR`;
        loadData();
      });

      it('should return last occurence when trying to get alarm on last day - 1', function() {
        const lastFire = moment('20171224T135500').tz(timezone).subtract(1, 'day').toDate();

        expect(module.getNextAlarm(vevent, valarm, lastFire)).to.equalDate(moment('2017-12-24T12:55:00Z').toDate());
      });

      it('should return null when trying to get alarm on last day', function() {
        const lastFire = moment(until).tz(timezone).toDate();

        expect(module.getNextAlarm(vevent, valarm, lastFire)).to.not.be.defined;
      });

      it('should return null when trying to get alarm after the last day', function() {
        const lastFire = moment(until).tz(timezone).toDate();

        expect(module.getNextAlarm(vevent, valarm, lastFire)).to.not.be.defined;
      });
    });
  });
});
