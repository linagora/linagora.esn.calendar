const { expect } = require('chai');
const sinon = require('sinon');
const mockery = require('mockery');

describe('The Resource handlers module', function() {
  let emailModule, error, translate, eventDetails, baseUrl, eventInCalendar, helpers, payload, jcalHelper, linksHelper, userModule, sendHTML, i18nModule;
  let from, to, subject, ics, eventPath, emailTemplateName, context;

  beforeEach(function() {
    error = new Error('I failed');
    from = 'from@open-paas.org';
    to = 'to@open-paas.org';
    subject = 'This is a subject';
    ics = 'This is an ICS';
    eventPath = '/foo/bar/baz.ics';
    emailTemplateName = 'resource.request';
    context = { foo: 'bar' };
    payload = {
      from,
      to,
      subject,
      ics,
      eventPath,
      emailTemplateName,
      context
    };

    sendHTML = sinon.stub().returns(Promise.resolve());
    emailModule = {
      getMailer: () => ({
        sendHTML
      })
    };

    translate = sinon.stub().returns('translated');
    i18nModule = {
      getI18nForMailer: sinon.stub().returns(Promise.resolve({ translate }))
    };

    baseUrl = 'http://localhost';
    helpers = {
      config: {
        getBaseUrl: function(arg, callback) {
          callback(null, baseUrl);
        }
      }
    };

    eventDetails = 'http://details';
    eventInCalendar = 'http://incalendar';
    linksHelper = {
      getEventDetails: sinon.stub().returns(Promise.resolve(eventDetails)),
      getEventInCalendar: sinon.stub().returns(Promise.resolve(eventInCalendar))
    };

    jcalHelper = {
      jcal2content: sinon.stub().returns('A CAL Object')
    };

    userModule = {
      findByEmail: sinon.spy(function(email, callback) {
        callback(null, {_id: 1});
      })
    };

    this.moduleHelpers.addDep('helpers', helpers);
    this.moduleHelpers.addDep('email', emailModule);
    this.moduleHelpers.addDep('user', userModule);
    mockery.registerMock('../i18n', () => i18nModule);
    mockery.registerMock('../helpers/links', () => linksHelper);
    mockery.registerMock('../helpers/jcal', jcalHelper);
    this.requireModule = function() {
      return require(`${this.moduleHelpers.modulePath}/backend/lib/email/sender`)(this.moduleHelpers.dependencies);
    };
  });

  describe('The send function', function() {
    it('should reject when getBaseUrl rejects', function(done) {
      helpers.config.getBaseUrl = function(arg, callback) {
        callback(error);
      };

      this.requireModule().send(payload)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err).to.equals(error);
          done();
        });
    });

    it('should reject when getEventDetails rejects', function(done) {
      linksHelper.getEventDetails.returns(Promise.reject(error));

      this.requireModule().send(payload)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err).to.equals(error);
          done();
        });
    });

    it('should reject when getEventInCalendar rejects', function(done) {
      linksHelper.getEventInCalendar.returns(Promise.reject(error));

      this.requireModule().send(payload)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err).to.equals(error);
          done();
        });
    });

    it('should send as many emails as there are email recipients', function(done) {
      payload.to = ['foo@open-paas.org', 'bar@open-paas.org'];

      this.requireModule().send(payload)
        .then(() => {
          expect(userModule.findByEmail).to.have.been.calledWith(payload.to[0]);
          expect(userModule.findByEmail).to.have.been.calledWith(payload.to[1]);
          expect(translate).to.have.been.calledWith(payload.subject);
          expect(sendHTML).to.have.been.calledTwice;
          done();
        })
        .catch(done);
    });

    it('should user user.preferredEmail when to is a user object', function(done) {
      payload.to = {_id: 1, preferredEmail: 'me@open-paas.org'};

      this.requireModule().send(payload)
        .then(() => {
          expect(userModule.findByEmail).to.not.have.been.called;
          expect(translate).to.have.been.calledWith(payload.subject);
          expect(sendHTML).to.have.been.calledOnce;
          done();
        })
        .catch(done);
    });

    it('should translate subject correctly when not a string', function(done) {
      payload.subject = { phrase: payload.subject, parameters: 'The parameters' };

      this.requireModule().send(payload)
        .then(() => {
          expect(translate).to.have.been.calledWith(payload.subject.phrase, payload.subject.parameters);
          done();
        })
        .catch(done);
    });

  });
});
