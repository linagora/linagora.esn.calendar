const sinon = require('sinon');
const { expect } = require('chai');
const momentTimezone = require('moment-timezone');

require('moment/locale/vi');

describe('The datetime helper', function() {
  let i18nMock, loggerMock;

  beforeEach(function() {
    this.calendarModulePath = this.moduleHelpers.modulePath;

    this.requireModule = function() {
      return require(this.calendarModulePath + '/backend/lib/helpers/datetime')(this.moduleHelpers.dependencies);
    };

    i18nMock = {
      i18nConfigTemplate: {
        momentLocales: {
          vi: 'vi',
          ru: 'ru'
        }
      }
    };

    loggerMock = {
      error: sinon.stub()
    };

    this.moduleHelpers.addDep('i18n', i18nMock);
    this.moduleHelpers.addDep('logger', loggerMock);
  });

  describe('On initialization', function() {
    it('should require the necessary moment locales', function() {
      const requireSpy = sinon.spy(require.extensions, '.js');

      this.requireModule();

      const required = {
        vi: false,
        ru: false
      };

      requireSpy.getCalls().forEach(requireCall => {
        if (requireCall.args[1].includes('moment/locale/vi')) required.vi = true;
        else if (requireCall.args[1].includes('moment/locale/ru')) required.ru = true;
      });

      expect(required.vi).to.be.true;
      expect(required.ru).to.be.true;
    });

    it('should log an error when the moment locale is not found', function() {
      i18nMock.i18nConfigTemplate.momentLocales = {
        zh: 'zh-non-existent',
        vi: 'vi-non-existent'
      };

      this.requireModule();

      expect(loggerMock.error).to.have.been.calledTwice;
      expect(loggerMock.error.getCall(0).args[0]).to.equal(`'${i18nMock.i18nConfigTemplate.momentLocales.zh}' is not a valid Moment locale. When formatting datetime with this locale, 'en' is going to be used instead.`);
      expect(loggerMock.error.getCall(1).args[0]).to.equal(`'${i18nMock.i18nConfigTemplate.momentLocales.vi}' is not a valid Moment locale. When formatting datetime with this locale, 'en' is going to be used instead.`);
    });
  });

  describe('The formatDatetime function', function() {
    let datetimeHelpers;

    beforeEach(function() {
      datetimeHelpers = this.requireModule();
    });

    it('should throw an error if momentDatetime is not an instance of momentTimezone', function(done) {
      try {
        datetimeHelpers.formatDatetime(new Date(), {});
        done(new Error('An error should have been thrown'));
      } catch (err) {
        expect(err).to.exist;
        expect(err.message).to.equal('momentDatetime must be an instance of momentTimezone');
        done();
      }
    });

    it('should be able to format datetime with default options', function() {
      const momentDatetime = momentTimezone.utc([2020, 5, 5, 15, 30]);
      const { date, time } = datetimeHelpers.formatDatetime(momentDatetime, {});

      expect(date).to.equal('06/05/2020');
      expect(time).to.equal('03:30 PM');
    });

    it('should be able to format datetime with 24-hour time format', function() {
      const momentDatetime = momentTimezone.utc([2020, 5, 5, 15, 30]);
      const { date, time } = datetimeHelpers.formatDatetime(momentDatetime, { use24hourFormat: true });

      expect(date).to.equal('06/05/2020');
      expect(time).to.equal('15:30');
    });

    it('should be able to convert timezone correctly', function() {
      const momentDatetime = momentTimezone.utc([2020, 5, 5, 15, 30]);
      const { date, time } = datetimeHelpers.formatDatetime(momentDatetime, { timezone: 'Asia/Ho_Chi_Minh', use24hourFormat: true });

      expect(date).to.equal('06/05/2020');
      expect(time).to.equal('22:30');
    });

    it('should fallback to UTC when the provided timezone is invalid', function() {
      const momentDatetime = momentTimezone.utc([2020, 5, 5, 15, 30]);
      const { date, time } = datetimeHelpers.formatDatetime(momentDatetime, { timezone: 'Totally INVALID', use24hourFormat: true });

      expect(date).to.equal('06/05/2020');
      expect(time).to.equal('15:30');
    });

    it('should be able to format datetime with locale', function() {
      const momentDatetime = momentTimezone.utc([2020, 5, 5, 15, 30]);
      const { date, time } = datetimeHelpers.formatDatetime(momentDatetime, { timezone: 'Asia/Ho_Chi_Minh', locale: 'vi' });

      expect(date).to.equal('05/06/2020');
      expect(time).to.equal('10:30 CH');
    });

    it('should fallback to "en" locale when the provided moment locale is not found', function() {
      const momentDatetime = momentTimezone.utc([2020, 5, 5, 15, 30]);
      const { date, time } = datetimeHelpers.formatDatetime(momentDatetime, { timezone: 'Asia/Ho_Chi_Minh', locale: 'not-found' });

      expect(date).to.equal('06/05/2020');
      expect(time).to.equal('10:30 PM');
    });
  });
});
