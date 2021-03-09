const mockery = require('mockery');
const sinon = require('sinon');
const { expect } = require('chai');

describe('The email event helper', function() {
  let jcalHelperMock, datetimeHelperMock;
  let ics, isAllDay, timezone, use24hourFormat, locale, icalEvent, icalDateAsMoments, formattedDatetimes;

  beforeEach(function() {
    ics = 'ics';
    isAllDay = false;
    timezone = 'Asia/Ho_Chi_Minh';
    use24hourFormat = true;
    locale = 'en';
    icalEvent = {
      startDate: 'startDate',
      endDate: 'endDate'
    };
    icalDateAsMoments = [{ id: 'moment-object-1'}, { id: 'moment-object-2', subtract: sinon.stub() }];
    icalDateAsMoments[1].subtract.returns(icalDateAsMoments[1]);
    formattedDatetimes = [
      { date: 'startDate', time: 'startTime', fullDate: 'startFullDate', fullDateTime: 'startFullDateTime' },
      { date: 'endDate', time: 'endTime', fullDate: 'endFullDate', fullDateTime: 'endFullDateTime' }
    ];

    datetimeHelperMock = {
      formatDatetime: sinon.stub()
    };

    datetimeHelperMock.formatDatetime.onCall(0).returns(formattedDatetimes[0]);
    datetimeHelperMock.formatDatetime.onCall(1).returns(formattedDatetimes[1]);

    jcalHelperMock = {
      getIcalEvent: sinon.stub().returns(icalEvent),
      getIcalDateAsMoment: sinon.stub()
    };

    jcalHelperMock.getIcalDateAsMoment.onCall(0).returns(icalDateAsMoments[0]);
    jcalHelperMock.getIcalDateAsMoment.onCall(1).returns(icalDateAsMoments[1]);

    mockery.registerMock('./jcal', jcalHelperMock);
    mockery.registerMock('./datetime', () => datetimeHelperMock);

    this.calendarModulePath = this.moduleHelpers.modulePath;
    this.requireModule = function() {
      return require(this.calendarModulePath + '/backend/lib/helpers/email-event')(this.moduleHelpers.dependencies);
    };
  });

  describe('The getContentEventStartAndEnd function', function() {
    it('should return the correct object with only start formatted strings when only the start date is passed in', function() {
      const convertTzOptions = { timezone, locale, use24hourFormat };
      const result = this.requireModule().getContentEventStartAndEnd({ start: icalDateAsMoments[0], isAllDay, timezone, use24hourFormat, locale });

      expect(datetimeHelperMock.formatDatetime).to.have.been.calledOnce;
      expect(datetimeHelperMock.formatDatetime).to.have.been.calledWith(icalDateAsMoments[0], convertTzOptions);
      expect(result).to.deep.equal({
        start: { ...formattedDatetimes[0], timezone }
      });
    });

    it('should return the correct object with only end formatted strings when only the end date is passed in', function() {
      datetimeHelperMock.formatDatetime.onCall(0).returns(formattedDatetimes[1]);

      const convertTzOptions = { timezone, locale, use24hourFormat };
      const result = this.requireModule().getContentEventStartAndEnd({ end: icalDateAsMoments[1], isAllDay, timezone, use24hourFormat, locale });

      expect(datetimeHelperMock.formatDatetime).to.have.been.calledOnce;
      expect(datetimeHelperMock.formatDatetime).to.have.been.calledWith(icalDateAsMoments[1], convertTzOptions);
      expect(result).to.deep.equal({
        end: { ...formattedDatetimes[1], timezone }
      });
    });

    it('should return the correct object with start and end formatted strings when both start and end dates are passed in and it is not an all day event', function() {
      const convertTzOptions = { timezone, locale, use24hourFormat };
      const result = this.requireModule().getContentEventStartAndEnd({ start: icalDateAsMoments[0], end: icalDateAsMoments[1], isAllDay, timezone, use24hourFormat, locale });

      expect(datetimeHelperMock.formatDatetime).to.have.been.calledTwice;
      expect(datetimeHelperMock.formatDatetime.getCall(0).args[0]).to.equal(icalDateAsMoments[0]);
      expect(datetimeHelperMock.formatDatetime.getCall(0).args[1]).to.deep.equal(convertTzOptions);
      expect(datetimeHelperMock.formatDatetime.getCall(1).args[0]).to.equal(icalDateAsMoments[1]);
      expect(datetimeHelperMock.formatDatetime.getCall(1).args[1]).to.deep.equal(convertTzOptions);
      expect(result).to.deep.equal({
        start: { ...formattedDatetimes[0], timezone },
        end: { ...formattedDatetimes[1], timezone }
      });
    });

    it('should return the correct object with start and end formatted strings when both start and end dates are passed in and it is an all day event', function() {
      isAllDay = true;

      const convertTzOptions = { timezone, locale, use24hourFormat };
      const result = this.requireModule().getContentEventStartAndEnd({ start: icalDateAsMoments[0], end: icalDateAsMoments[1], isAllDay, timezone, use24hourFormat, locale });

      expect(datetimeHelperMock.formatDatetime).to.have.been.calledTwice;
      expect(datetimeHelperMock.formatDatetime.getCall(0).args[0]).to.equal(icalDateAsMoments[0]);
      expect(datetimeHelperMock.formatDatetime.getCall(0).args[1]).to.deep.equal(convertTzOptions);
      expect(datetimeHelperMock.formatDatetime.getCall(1).args[0]).to.equal(icalDateAsMoments[1]);
      expect(datetimeHelperMock.formatDatetime.getCall(1).args[1]).to.deep.equal(convertTzOptions);
      expect(icalDateAsMoments[1].subtract).to.have.been.calledWith(1, 'day');
      expect(result).to.deep.equal({
        start: { ...formattedDatetimes[0], timezone },
        end: { ...formattedDatetimes[1], timezone }
      });
    });
  });

  describe('The getContentEventStartAndEndFromIcs function', function() {
    it('should return the correct object with start and end formatted strings when the event is not an all day event', function() {
      const convertTzOptions = { timezone, locale, use24hourFormat };
      const result = this.requireModule().getContentEventStartAndEndFromIcs({ ics, isAllDay, timezone, use24hourFormat, locale });

      expect(jcalHelperMock.getIcalEvent).to.have.been.calledWith(ics);
      expect(jcalHelperMock.getIcalDateAsMoment.getCall(0).args[0]).to.equal(icalEvent.startDate);
      expect(jcalHelperMock.getIcalDateAsMoment.getCall(1).args[0]).to.equal(icalEvent.endDate);
      expect(datetimeHelperMock.formatDatetime.getCall(0).args[0]).to.equal(icalDateAsMoments[0]);
      expect(datetimeHelperMock.formatDatetime.getCall(0).args[1]).to.deep.equal(convertTzOptions);
      expect(datetimeHelperMock.formatDatetime.getCall(1).args[0]).to.equal(icalDateAsMoments[1]);
      expect(datetimeHelperMock.formatDatetime.getCall(1).args[1]).to.deep.equal(convertTzOptions);
      expect(result).to.deep.equal({
        start: { ...formattedDatetimes[0], timezone },
        end: { ...formattedDatetimes[1], timezone }
      });
    });

    it('should return the correct object with start and end formatted strings when the event is an all day event', function() {
      isAllDay = true;

      const convertTzOptions = { timezone, locale, use24hourFormat };
      const result = this.requireModule().getContentEventStartAndEndFromIcs({ ics, isAllDay, timezone, use24hourFormat, locale });

      expect(jcalHelperMock.getIcalEvent).to.have.been.calledWith(ics);
      expect(jcalHelperMock.getIcalDateAsMoment.getCall(0).args[0]).to.equal(icalEvent.startDate);
      expect(jcalHelperMock.getIcalDateAsMoment.getCall(1).args[0]).to.equal(icalEvent.endDate);
      expect(datetimeHelperMock.formatDatetime.getCall(0).args[0]).to.equal(icalDateAsMoments[0]);
      expect(datetimeHelperMock.formatDatetime.getCall(0).args[1]).to.deep.equal(convertTzOptions);
      expect(datetimeHelperMock.formatDatetime.getCall(1).args[0]).to.equal(icalDateAsMoments[1]);
      expect(datetimeHelperMock.formatDatetime.getCall(1).args[1]).to.deep.equal(convertTzOptions);
      expect(icalDateAsMoments[1].subtract).to.have.been.calledWith(1, 'day');
      expect(result).to.deep.equal({
        start: { ...formattedDatetimes[0], timezone },
        end: { ...formattedDatetimes[1], timezone }
      });
    });
  });
});
