const expect = require('chai').expect;
const sinon = require('sinon');
const mockery = require('mockery');

describe('The email alarm handler', function() {
  let sendHTMLMock, linksHelper, attendee, alarm, eventPath, emailModule, helpers, userLib, esnConfigMock, baseURL, user;

  beforeEach(function() {
    user = {_id: 1};
    baseURL = 'http://localhost:8080';
    attendee = 'user1@open-paas.org';
    eventPath = '/calendars/USER/CAL_ID/EVENT_UID.ics';
    alarm = {
      attendee,
      eventPath
    };
    sendHTMLMock = sinon.stub().returns(Promise.resolve({}));
    emailModule = {
      getMailer: function() {
        return { sendHTML: sendHTMLMock };
      }
    };
    helpers = {
      config: {
        getBaseUrl: function(user, callback) {
          callback(null, baseURL);
        }
      }
    };
    userLib = {
      findByEmail: function(email, cb) {
        cb(null, user);
      }
    };
    esnConfigMock = function(configName) {
      expect(configName).to.equal('locale');

      return {
        inModule: function(module) {
          expect(module).to.equal('core');

          return {
            forUser: () => {}
          };
        }
      };
    };

    linksHelper = {
      getEventDetails: () => Promise.resolve(`${baseURL}/details`),
      getEventInCalendar: () => Promise.resolve(`${baseURL}/calendar`)
    };

    this.moduleHelpers.addDep('helpers', helpers);
    this.moduleHelpers.addDep('email', emailModule);
    this.moduleHelpers.addDep('i18n', this.helpers.requireBackend('core/i18n'));
    this.moduleHelpers.addDep('user', userLib);
    this.moduleHelpers.addDep('esn-config', esnConfigMock);

    mockery.registerMock('../../helpers/links', function() {
      return linksHelper;
    });

    this.calendarModulePath = this.moduleHelpers.modulePath;
    this.requireModule = () => require(this.calendarModulePath + '/backend/lib/alarm/handlers/email')(this.moduleHelpers.dependencies);
  });

  it('should return a valid object', function() {
    const handler = this.requireModule();

    expect(handler.action).to.be.a.string;
    expect(handler.handle).to.be.a.func;
  });

  describe('The handle function', function() {
    it('should reject when attendee is not found', function(done) {
      const stub = sinon.stub(userLib, 'findByEmail', (email, callback) => callback());

      this.requireModule().handle(alarm)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err.message).to.match(/User can not be found from email/);
          expect(stub).to.have.been.calledWith(attendee);
          done();
        });
    });

    it('should reject when attendee find rejects', function(done) {
      const error = new Error('I failed to get user');
      const stub = sinon.stub(userLib, 'findByEmail', (email, callback) => callback(error));

      this.requireModule().handle(alarm)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err).to.equal(error);
          expect(stub).to.have.been.calledWith(attendee);
          done();
        });
    });

    it('should reject if baseURL retrieval fails', function(done) {
      const error = new Error('I failed to get baseURL');
      const stub = sinon.stub(userLib, 'findByEmail', (email, callback) => callback(null, user));
      const getBaseURLStub = sinon.stub(helpers.config, 'getBaseUrl', (email, callback) => callback(error));

      this.requireModule().handle(alarm)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err).to.equal(error);
          expect(stub).to.have.been.calledWith(attendee);
          expect(getBaseURLStub).to.have.been.calledOnce;
          done();
        });
    });

    it('should reject if i18n retrieval fails', function(done) {
      const error = new Error('I failed to get i18n');
      const getI18nForMailer = sinon.stub().returns(Promise.reject(error));

      mockery.registerMock('../../i18n', () => ({ getI18nForMailer }));

      this.requireModule().handle(alarm)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err).to.equal(error);
          expect(getI18nForMailer).to.have.been.calledWith(user);
          done();
        });
    });

    it('should reject if linksHelper.getEventDetails rejects', function(done) {
      const error = new Error('I failed to getEventDetails');
      const stub = sinon.stub(linksHelper, 'getEventDetails').returns(Promise.reject(error));

      this.requireModule().handle(alarm)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err).to.equal(error);
          expect(stub).to.have.been.called;
          done();
        });
    });

    it('should reject if linksHelper.getEventInCalendar rejects', function(done) {
      const error = new Error('I failed to getEventInCalendar');
      const stub = sinon.stub(linksHelper, 'getEventInCalendar').returns(Promise.reject(error));

      this.requireModule().handle(alarm)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err).to.equal(error);
          expect(stub).to.have.been.called;
          done();
        });
    });

    it('should send email to the attendee with valid information', function(done) {
      const translated = 'translated';
      const translate = sinon.stub().returns(translated);
      const getI18nForMailer = sinon.stub().returns(Promise.resolve({
        translate
      }));

      mockery.registerMock('../../i18n', () => ({ getI18nForMailer }));

      const event = {
        alarm: {
          summary: 'Summary of alarm'
        },
        start: {
          date: new Date()
        }
      };
      const jcalHelper = {
        jcal2content: sinon.spy(() => event)
      };

      mockery.registerMock('../../helpers/jcal', jcalHelper);

      this.requireModule().handle(alarm).then(() => {
        expect(sendHTMLMock).to.have.been.calledWith(
          sinon.match({
            to: attendee,
            subject: `${translated} : ${event.alarm.summary}`
          }),
          sinon.match({
            name: 'event.alarm',
            path: sinon.match(/templates\/email/)
          }),
          sinon.match.has('content', sinon.match.has('alarm'))
        );
        done();
      }, done);
    });
  });
});
