const expect = require('chai').expect;
const sinon = require('sinon');
const Q = require('q');
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
    sendHTMLMock = sinon.stub().returns(Q.when({}));
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
      getEventDetails: function() {
        return Q.when(`${baseURL}/details`);
      },

      getEventInCalendar: function() {
        return Q.when(`${baseURL}/calendar`);
      }
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
    this.requireModule = function() {
      return require(this.calendarModulePath + '/backend/lib/alarm/handlers/email')(this.moduleHelpers.dependencies);
    };
  });

  it('should return a valid object', function() {
    const handler = this.requireModule();

    expect(handler.action).to.be.a.string;
    expect(handler.handle).to.be.a.func;
  });

  describe('The handle function', function() {
    it('should reject when attendee is not found', function(done) {
      const stub = sinon.stub(userLib, 'findByEmail', function(email, callback) {
        callback();
      });

      this.requireModule().handle(alarm).then(function() {
        done(new Error('Should not occur'));
      }, function(err) {
        expect(err.message).to.match(/User can not be found from email/);
        expect(stub).to.have.been.calledWith(attendee);
        done();
      });
    });

    it('should reject when attendee find rejects', function(done) {
      const error = new Error('I failed to get user');
      const stub = sinon.stub(userLib, 'findByEmail', function(email, callback) {
        callback(error);
      });

      this.requireModule().handle(alarm).then(function() {
        done(new Error('Should not occur'));
      }, function(err) {
        expect(err).to.equal(error);
        expect(stub).to.have.been.calledWith(attendee);
        done();
      });
    });

    it('should reject if baseURL retrieval fails', function(done) {
      const error = new Error('I failed to get baseURL');
      const stub = sinon.stub(userLib, 'findByEmail', function(email, callback) {
        callback(null, user);
      });
      const getBaseURLStub = sinon.stub(helpers.config, 'getBaseUrl', function(email, callback) {
        callback(error);
      });

      this.requireModule().handle(alarm).then(function() {
        done(new Error('Should not occur'));
      }, function(err) {
        expect(err).to.equal(error);
        expect(stub).to.have.been.calledWith(attendee);
        expect(getBaseURLStub).to.have.been.calledOnce;
        done();
      });
    });

    it('should reject if i18n retrieval fails', function(done) {
      const error = new Error('I failed to get i18n');
      const getI18nForMailer = sinon.spy(function() {
        return Q.reject(error);
      });

      mockery.registerMock('../../i18n', function() {
        return {
          getI18nForMailer
        };
      });

      this.requireModule().handle(alarm).then(function() {
        done(new Error('Should not occur'));
      }, function(err) {
        expect(err).to.equal(error);
        expect(getI18nForMailer).to.have.been.calledWith(user);
        done();
      });
    });

    it('should reject if linksHelper.getEventDetails rejects', function(done) {
      const error = new Error('I failed to getEventDetails');
      const stub = sinon.stub(linksHelper, 'getEventDetails').returns(Q.reject(error));

      this.requireModule().handle(alarm).then(function() {
        done(new Error('Should not occur'));
      }, function(err) {
        expect(err).to.equal(error);
        expect(stub).to.have.been.called;
        done();
      });
    });

    it('should reject if linksHelper.getEventInCalendar rejects', function(done) {
      const error = new Error('I failed to getEventInCalendar');
      const stub = sinon.stub(linksHelper, 'getEventInCalendar').returns(Q.reject(error));

      this.requireModule().handle(alarm).then(function() {
        done(new Error('Should not occur'));
      }, function(err) {
        expect(err).to.equal(error);
        expect(stub).to.have.been.called;
        done();
      });
    });

    it('should send email to the attendee with valid information', function(done) {
      const event = {
        alarm: {
          summary: 'Summary of alarm'
        },
        start: {
          date: new Date()
        }
      };
      const jcalHelper = {
        jcal2content: sinon.spy(function() {
          return event;
        })
      };

      mockery.registerMock('../../helpers/jcal', jcalHelper);

      this.requireModule().handle(alarm).then(function() {
        expect(sendHTMLMock).to.have.been.calledWith(
          sinon.match({
            to: attendee,
            subject: event.alarm.summary
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
