const mockery = require('mockery');
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

    const customMomentFormat = {
      fullDateTime24Hours: '[FDT24]',
      fullDateTime12Hours: '[FDT12]',
      fullDate: '[FD]'
    };

    const longDateFormat = {
      [customMomentFormat.fullDateTime24Hours]: 'dddd D MMMM YYYY HH:mm',
      [customMomentFormat.fullDateTime12Hours]: 'dddd D MMMM YYYY hh:mm A',
      [customMomentFormat.fullDate]: 'dddd D MMMM YYYY'
    };

    i18nMock = {
      i18nConfigTemplate: {
        moment: {
          momentLocales: {
            vi: 'vi',
            ru: 'ru'
          },
          customMomentFormat,
          momentLocalesOverrideConfig: {
            en: { longDateFormat },
            vi: { longDateFormat },
            ru: { longDateFormat }
          }
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
    let sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should use the default i18n config for moment if there is no provided i18n config for moment', function() {
      delete i18nMock.i18nConfigTemplate.moment;

      this.moduleHelpers.addDep('i18n', i18nMock);

      const requireSpy = sandbox.spy(require.extensions, '.js');
      const momentTimezoneMock = momentTimezone;

      momentTimezoneMock.locale = sandbox.stub();

      mockery.registerMock('moment-timezone', momentTimezoneMock);

      const datetimeHelpers = this.requireModule();

      requireSpy.getCalls().forEach(requireCall => {
        expect(requireCall.args[1].includes('moment/locale')).to.be.false;
      });
      expect(momentTimezoneMock.locale).to.have.been.calledOnce;
      expect(momentTimezoneMock.locale).to.have.been.calledWith('en');

      const momentDatetime = momentTimezone.utc([2020, 5, 5, 15, 30]);
      const { date: date12, time: time12, fullDateTime: fullDateTime12, fullDate: fullDate12 } =
        datetimeHelpers.formatDatetime(momentDatetime, { use24hourFormat: false, locale: 'vi' });

      expect(date12).to.equal('06/05/2020');
      expect(time12).to.equal('03:30 PM');
      expect(fullDateTime12).to.equal('Friday, June 5, 2020 3:30 PM');
      expect(fullDate12).to.equal('June 5, 2020');

      const { date: date24, time: time24, fullDateTime: fullDateTime24, fullDate: fullDate24 } =
        datetimeHelpers.formatDatetime(momentDatetime, { use24hourFormat: true, locale: 'vi' });

      expect(date24).to.equal('06/05/2020');
      expect(time24).to.equal('15:30');
      expect(fullDateTime24).to.equal('Friday, June 5, 2020 3:30 PM');
      expect(fullDate24).to.equal('June 5, 2020');
    });

    it('should require the necessary moment locales and set en as the default locale', function() {
      const requireSpy = sandbox.spy(require.extensions, '.js');
      const momentTimezoneMock = {
        updateLocale: () => {},
        locale: sandbox.stub()
      };

      mockery.registerMock('moment-timezone', momentTimezoneMock);

      this.requireModule();

      const required = {
        en: false,
        vi: false,
        ru: false
      };

      requireSpy.getCalls().forEach(requireCall => {
        if (requireCall.args[1].includes('moment/locale/vi')) required.vi = true;
        else if (requireCall.args[1].includes('moment/locale/ru')) required.ru = true;
        else if (requireCall.args[1].includes('moment/locale/en')) required.en = true;
      });

      expect(required.vi).to.be.true;
      expect(required.ru).to.be.true;
      expect(required.en).to.be.false;
      expect(momentTimezoneMock.locale).to.have.been.calledOnce;
      expect(momentTimezoneMock.locale).to.have.been.calledWith('en');
    });

    it('should log an error when the moment locale is not found', function() {
      const momentTimezoneMock = {
        updateLocale: () => {},
        locale: () => {}
      };

      mockery.registerMock('moment-timezone', momentTimezoneMock);

      i18nMock.i18nConfigTemplate.moment.momentLocales = {
        zh: 'zh-non-existent',
        vi: 'vi-non-existent'
      };

      this.requireModule();

      expect(loggerMock.error).to.have.been.calledTwice;
      expect(loggerMock.error.getCall(0).args[0]).to.equal(`'${i18nMock.i18nConfigTemplate.moment.momentLocales.zh}' is not a valid Moment locale. When formatting datetime with this locale, 'en' is going to be used instead.`);
      expect(loggerMock.error.getCall(1).args[0]).to.equal(`'${i18nMock.i18nConfigTemplate.moment.momentLocales.vi}' is not a valid Moment locale. When formatting datetime with this locale, 'en' is going to be used instead.`);
    });

    it('should update the supported moment locales with the equivalent override configs', function() {
      const momentTimezoneMock = {
        updateLocale: sandbox.stub(),
        locale: sandbox.stub()
      };

      mockery.registerMock('moment-timezone', momentTimezoneMock);

      this.requireModule();

      expect(momentTimezoneMock.updateLocale.getCall(0).args).to.deep.equal(['vi', i18nMock.i18nConfigTemplate.moment.momentLocalesOverrideConfig.vi]);
      expect(momentTimezoneMock.updateLocale.getCall(1).args).to.deep.equal(['ru', i18nMock.i18nConfigTemplate.moment.momentLocalesOverrideConfig.ru]);
      expect(momentTimezoneMock.updateLocale.getCall(2).args).to.deep.equal(['en', i18nMock.i18nConfigTemplate.moment.momentLocalesOverrideConfig.en]);
      expect(momentTimezoneMock.locale).to.have.been.calledOnce;
      expect(momentTimezoneMock.locale).to.have.been.calledWith('en');
    });

    it('should log an error when the override config for a locale is not found', function() {
      const momentTimezoneMock = {
        updateLocale: sandbox.stub(),
        locale: sandbox.stub()
      };

      delete i18nMock.i18nConfigTemplate.moment.momentLocalesOverrideConfig.ru;
      delete i18nMock.i18nConfigTemplate.moment.momentLocalesOverrideConfig.en;

      mockery.registerMock('moment-timezone', momentTimezoneMock);

      this.requireModule();

      expect(momentTimezoneMock.updateLocale).to.have.been.calledOnce;
      expect(momentTimezoneMock.updateLocale).to.have.been.calledWith('vi', i18nMock.i18nConfigTemplate.moment.momentLocalesOverrideConfig.vi);
      expect(loggerMock.error).to.have.been.calledTwice;
      expect(loggerMock.error.getCall(0).args[0]).to.equal('There is no override config for the current locale (ru).');
      expect(loggerMock.error.getCall(1).args[0]).to.equal('There is no override config for the current locale (en).');
      expect(momentTimezoneMock.locale).to.have.been.calledOnce;
      expect(momentTimezoneMock.locale).to.have.been.calledWith('en');
    });
  });

  describe('The formatDatetime function', function() {
    let datetimeHelpers;

    beforeEach(function() {
      mockery.registerMock('moment-timezone', momentTimezone);
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
      const { date, time, fullDateTime, fullDate } = datetimeHelpers.formatDatetime(momentDatetime, {});

      expect(date).to.equal('06/05/2020');
      expect(time).to.equal('03:30 PM');
      expect(fullDateTime).to.equal('Friday 5 June 2020 03:30 PM');
      expect(fullDate).to.equal('Friday 5 June 2020');
    });

    it('should be able to format datetime with 24-hour time format', function() {
      const momentDatetime = momentTimezone.utc([2020, 5, 5, 15, 30]);
      const { date, time, fullDateTime, fullDate } = datetimeHelpers.formatDatetime(momentDatetime, { use24hourFormat: true });

      expect(date).to.equal('06/05/2020');
      expect(time).to.equal('15:30');
      expect(fullDateTime).to.equal('Friday 5 June 2020 15:30');
      expect(fullDate).to.equal('Friday 5 June 2020');
    });

    it('should be able to convert timezone correctly', function() {
      const momentDatetime = momentTimezone.utc([2020, 5, 5, 15, 30]);
      const { date, time, fullDateTime, fullDate } = datetimeHelpers.formatDatetime(momentDatetime, { timezone: 'Asia/Ho_Chi_Minh', use24hourFormat: true });

      expect(date).to.equal('06/05/2020');
      expect(time).to.equal('22:30');
      expect(fullDateTime).to.equal('Friday 5 June 2020 22:30');
      expect(fullDate).to.equal('Friday 5 June 2020');
    });

    it('should fallback to UTC when the provided timezone is invalid', function() {
      const momentDatetime = momentTimezone.utc([2020, 5, 5, 15, 30]);
      const { date, time, fullDateTime, fullDate } = datetimeHelpers.formatDatetime(momentDatetime, { timezone: 'Totally INVALID', use24hourFormat: true });

      expect(date).to.equal('06/05/2020');
      expect(time).to.equal('15:30');
      expect(fullDateTime).to.equal('Friday 5 June 2020 15:30');
      expect(fullDate).to.equal('Friday 5 June 2020');
    });

    it('should be able to format datetime with locale', function() {
      const momentDatetime = momentTimezone.utc([2020, 5, 5, 15, 30]);
      const { date, time, fullDateTime, fullDate } = datetimeHelpers.formatDatetime(momentDatetime, { timezone: 'Asia/Ho_Chi_Minh', locale: 'vi' });

      expect(date).to.equal('05/06/2020');
      expect(time).to.equal('10:30 CH');
      expect(fullDateTime).to.equal('thứ sáu 5 tháng 6 2020 10:30 CH');
      expect(fullDate).to.equal('thứ sáu 5 tháng 6 2020');
    });

    it('should fallback to "en" locale when the provided moment locale is not found', function() {
      const momentDatetime = momentTimezone.utc([2020, 5, 5, 15, 30]);
      const { date, time, fullDateTime, fullDate } = datetimeHelpers.formatDatetime(momentDatetime, { timezone: 'Asia/Ho_Chi_Minh', locale: 'not-found' });

      expect(date).to.equal('06/05/2020');
      expect(time).to.equal('10:30 PM');
      expect(fullDateTime).to.equal('Friday 5 June 2020 10:30 PM');
      expect(fullDate).to.equal('Friday 5 June 2020');
    });

    it('should fallback to the default long date format of moment when there is no override config for a locale', function() {
      delete i18nMock.i18nConfigTemplate.moment.momentLocalesOverrideConfig.vi;

      const { formatDatetime } = this.requireModule();
      const momentDatetime = momentTimezone.utc([2020, 5, 5, 15, 30]);
      const { date: date12, time: time12, fullDateTime: fullDateTime12, fullDate: fullDate12 } =
        formatDatetime(momentDatetime, { timezone: 'Asia/Ho_Chi_Minh', locale: 'vi' });

      expect(date12).to.equal('05/06/2020');
      expect(time12).to.equal('10:30 CH');
      expect(fullDateTime12).to.equal('thứ sáu, 5 tháng 6 năm 2020 22:30');
      expect(fullDate12).to.equal('5 tháng 6 năm 2020');

      const { date: date24, time: time24, fullDateTime: fullDateTime24, fullDate: fullDate24 } =
        formatDatetime(momentDatetime, { timezone: 'Asia/Ho_Chi_Minh', locale: 'vi', use24hourFormat: true });

      expect(date24).to.equal('05/06/2020');
      expect(time24).to.equal('22:30');
      expect(fullDateTime24).to.equal('thứ sáu, 5 tháng 6 năm 2020 22:30');
      expect(fullDate24).to.equal('5 tháng 6 năm 2020');
    });

    it('should fallback to the default long date time format of moment when there is no override config for the 24-hour full date time format', function() {
      delete i18nMock.i18nConfigTemplate.moment.customMomentFormat.fullDateTime24Hours;

      const { formatDatetime } = this.requireModule();
      const momentDatetime = momentTimezone.utc([2020, 5, 5, 15, 30]);
      const { date, time, fullDateTime } = formatDatetime(momentDatetime, { timezone: 'Asia/Ho_Chi_Minh', locale: 'vi', use24hourFormat: true });

      expect(date).to.equal('05/06/2020');
      expect(time).to.equal('22:30');
      expect(fullDateTime).to.equal('thứ sáu, 5 tháng 6 năm 2020 22:30');
    });

    it('should fallback to the default long date time format of moment when there is no override config for the 12-hour full date time format', function() {
      delete i18nMock.i18nConfigTemplate.moment.customMomentFormat.fullDateTime12Hours;

      const { formatDatetime } = this.requireModule();
      const momentDatetime = momentTimezone.utc([2020, 5, 5, 15, 30]);
      const { date, time, fullDateTime } = formatDatetime(momentDatetime, { timezone: 'Asia/Ho_Chi_Minh', locale: 'vi' });

      expect(date).to.equal('05/06/2020');
      expect(time).to.equal('10:30 CH');
      expect(fullDateTime).to.equal('thứ sáu, 5 tháng 6 năm 2020 22:30');
    });

    it('should fallback to the default long date format of moment when there is no override config for the full date format', function() {
      delete i18nMock.i18nConfigTemplate.moment.customMomentFormat.fullDate;

      const { formatDatetime } = this.requireModule();
      const momentDatetime = momentTimezone.utc([2020, 5, 5, 15, 30]);
      const { date, time, fullDate } = formatDatetime(momentDatetime, { timezone: 'Asia/Ho_Chi_Minh', locale: 'vi' });

      expect(date).to.equal('05/06/2020');
      expect(time).to.equal('10:30 CH');
      expect(fullDate).to.equal('5 tháng 6 năm 2020');
    });
  });
});
