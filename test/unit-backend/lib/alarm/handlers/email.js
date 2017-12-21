const expect = require('chai').expect;
const sinon = require('sinon');
const mockery = require('mockery');

describe('The email alarm handler', function() {
  let event, ics, jcalHelper, getEventSummaryForUser, attendee, alarm, eventPath, emailModule, sendMock, helpers, userLib, esnConfigMock, baseURL, user;

  beforeEach(function() {
    user = {_id: 1};
    ics = 'The event ICS';
    event = {
      summary: 'The event summary'
    };
    baseURL = 'http://localhost:8080';
    attendee = 'user1@open-paas.org';
    eventPath = '/calendars/USER/CAL_ID/EVENT_UID.ics';
    jcalHelper = {
      jcal2content: sinon.stub().returns(event)
    };
    alarm = {
      ics,
      attendee,
      eventPath
    };
    sendMock = sinon.stub().returns(Promise.resolve({}));
    emailModule = {
      sender: {
        send: sendMock
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
    getEventSummaryForUser = sinon.stub().returns(Promise.resolve(event.summary));

    this.moduleHelpers.addDep('helpers', helpers);
    this.moduleHelpers.addDep('i18n', this.helpers.requireBackend('core/i18n'));
    this.moduleHelpers.addDep('user', userLib);
    this.moduleHelpers.addDep('esn-config', esnConfigMock);

    mockery.registerMock('../../helpers/jcal', jcalHelper);
    mockery.registerMock('../../helpers/i18n', () => ({ getEventSummaryForUser }));
    mockery.registerMock('../../email', () => emailModule);

    this.calendarModulePath = this.moduleHelpers.modulePath;
    this.requireModule = () => require(this.calendarModulePath + '/backend/lib/alarm/handlers/email')(this.moduleHelpers.dependencies);
  });

  it('should return a valid object', function() {
    const handler = this.requireModule();

    expect(handler.action).to.be.a.string;
    expect(handler.handle).to.be.a.func;
  });

  describe('The handle function', function() {
    it('should reject when attendee is not a user', function(done) {
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

    it('should reject if i18nHelper.getEventSummaryForUser rejects', function(done) {
      const error = new Error('I failed to translate summary');

      getEventSummaryForUser.returns(Promise.reject(error));

      this.requireModule().handle(alarm)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err).to.equal(error);
          expect(getEventSummaryForUser).to.have.been.calledWith(event.summary, user);
          done();
        });
    });

    it('should send email to the attendee with valid information', function(done) {
      this.requireModule().handle(alarm).then(() => {
        expect(sendMock).to.have.been.calledWith({
          to: attendee,
          subject: sinon.match({
            phrase: 'Notification: {{summary}}'
          }),
          ics,
          eventPath,
          emailTemplateName: 'event.alarm'
        });
        done();
      }, done);
    });
  });
});
