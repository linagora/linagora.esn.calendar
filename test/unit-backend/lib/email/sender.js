const path = require('path');
const { expect } = require('chai');
const sinon = require('sinon');
const mockery = require('mockery');

describe('The email sender module', function() {
  let emailModule, error, translate, eventDetails, baseUrl, eventInCalendar, helpers, payload, jcalHelper, linksHelper,
    userModule, sendHTML, i18nModule, emailEventHelper, esnConfig, sendWithCustomTemplateFunctionStub, urlHelper;
  let from, to, subject, ics, eventPath, emailTemplateName, context, locale, event, user;
  let getContentEventStartAndEndStub;

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
    sendWithCustomTemplateFunctionStub = sinon.stub().returns(Promise.resolve());
    emailModule = {
      getMailer: sinon.spy(() => ({
        sendHTML,
        sendWithCustomTemplateFunction: sendWithCustomTemplateFunctionStub
      }))
    };

    translate = sinon.stub().returns('translated');
    locale = 'en';
    i18nModule = {
      getI18nForMailer: sinon.stub().returns(Promise.resolve({ translate, locale }))
    };

    baseUrl = 'http://localhost';
    helpers = {
      config: {
        getBaseUrl: sinon.spy(function(arg, callback) {
          callback(null, baseUrl);
        })
      }
    };

    eventDetails = 'http://details';
    eventInCalendar = 'http://incalendar';
    linksHelper = {
      getEventDetails: sinon.stub().returns(Promise.resolve(eventDetails)),
      getEventInCalendar: sinon.stub().returns(Promise.resolve(eventInCalendar))
    };

    event = { uid: 'uid', allDay: false, location: 'Hanoi' };
    jcalHelper = {
      jcal2content: sinon.stub().returns(event)
    };

    user = { _id: 1 };
    userModule = {
      findByEmail: sinon.spy(function(email, callback) {
        callback(null, user);
      })
    };

    getContentEventStartAndEndStub = sinon.stub();
    emailEventHelper = () => ({
      getContentEventStartAndEnd: getContentEventStartAndEndStub
    });

    urlHelper = {
      isValidURL: sinon.stub().returns(false),
      isAbsoluteURL: sinon.stub().returns(false)
    };

    this.moduleHelpers.addDep('helpers', helpers);
    this.moduleHelpers.addDep('email', emailModule);
    this.moduleHelpers.addDep('user', userModule);
    mockery.registerMock('../i18n', () => i18nModule);
    mockery.registerMock('../helpers/links', () => linksHelper);
    mockery.registerMock('../helpers/jcal', jcalHelper);
    mockery.registerMock('../helpers/email-event', emailEventHelper);
    mockery.registerMock('../helpers/url', urlHelper);
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

    it('should use user.preferredEmail when to is a user object', function(done) {
      payload.to = {_id: 1, preferredEmail: 'me@open-paas.org'};

      this.requireModule().send(payload)
        .then(() => {
          expect(userModule.findByEmail).to.not.have.been.called;
          expect(translate).to.have.been.calledWith(payload.subject);
          expect(sendHTML).to.have.been.calledOnce;
          expect(emailModule.getMailer).to.have.been.calledWith(payload.to);
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

  describe('The sendWithCustomTemplateFunction function', function() {
    let icalEvent, startDateAsMoment, endDateAsMoment;

    beforeEach(function() {
      icalEvent = {
        startDate: 'startDate',
        endDate: 'endDate'
      };

      startDateAsMoment = { _i: 'start' };
      endDateAsMoment = { _i: 'end' };

      jcalHelper.getIcalEvent = sinon.stub().returns(icalEvent);
      jcalHelper.getIcalDateAsMoment = sinon.stub();
      jcalHelper.getIcalDateAsMoment.onCall(0).returns(startDateAsMoment);
      jcalHelper.getIcalDateAsMoment.onCall(1).returns(endDateAsMoment);
    });

    it('should reject when getBaseUrl rejects', function(done) {
      helpers.config.getBaseUrl = function(arg, callback) {
        expect(arg).to.be.null;
        callback(error);
      };

      this.requireModule().sendWithCustomTemplateFunction(payload)
        .then(() => done(new Error('should not resolve')))
        .catch(err => {
          expect(err).to.equal(error);
          done();
        });
    });

    it('should reject when getEventInCalendar rejects', function(done) {
      linksHelper.getEventInCalendar.returns(Promise.reject(error));

      this.requireModule().sendWithCustomTemplateFunction(payload)
        .then(() => done(new Error('should not resolve')))
        .catch(err => {
          expect(linksHelper.getEventInCalendar).to.have.been.calledWith(ics);
          expect(err).to.equal(error);
          done();
        });
    });

    it('should send email with the default custom template function', function(done) {
      esnConfig = config => {
        expect(config).to.equal('datetime');

        return {
          inModule: module => {
            expect(module).to.equal('core');

            return {
              forUser: (whichUser, isUserWide) => {
                expect(whichUser).to.equal(user);
                expect(isUserWide).to.be.true;

                return {
                  get: (...args) => {
                    expect(args).to.be.deep.equal([]);

                    return {
                      timeZone: 'Asia/Ho_Chi_Minh',
                      use24hourFormat: true
                    };
                  }
                };
              }
            };
          }
        };
      };

      this.moduleHelpers.addDep('esn-config', esnConfig);

      const html = '<span>whatever</span>';
      const untransformedMJML = '<mjml-span>whatever</mjml-span>';
      mockery.registerMock('mjml', mjml => {
        expect(mjml).to.equal(untransformedMJML);

        return { html };
      });

      this.requireModule().sendWithCustomTemplateFunction(payload)
        .then(() => {
          expect(helpers.config.getBaseUrl).to.have.been.calledWith(null);
          expect(linksHelper.getEventInCalendar).to.have.been.calledWith(ics);
          expect(userModule.findByEmail).to.have.been.calledWith(to);
          expect(i18nModule.getI18nForMailer).to.have.been.calledWith(user);
          expect(jcalHelper.jcal2content).to.have.been.calledWith(ics, baseUrl);
          expect(jcalHelper.getIcalEvent).to.have.been.calledWith(ics);
          expect(jcalHelper.getIcalDateAsMoment.getCall(0).args[0]).to.equal(icalEvent.startDate);
          expect(jcalHelper.getIcalDateAsMoment.getCall(1).args[0]).to.equal(icalEvent.endDate);
          expect(getContentEventStartAndEndStub).to.have.been.calledWith({
            start: startDateAsMoment,
            end: endDateAsMoment,
            isAllDay: false,
            timezone: 'Asia/Ho_Chi_Minh',
            use24hourFormat: true,
            locale
          });
          expect(urlHelper.isValidURL).to.have.been.calledWith(event.location);
          expect(urlHelper.isAbsoluteURL).to.have.been.calledWith(event.location);
          expect(emailModule.getMailer).to.have.been.calledWith(user);
          expect(sendWithCustomTemplateFunctionStub).to.have.been.calledWith(sinon.match({
            message: {
              encoding: 'base64',
              from,
              to,
              subject: 'translated',
              headers: {}
            },
            template: { name: emailTemplateName, path: path.resolve(__dirname, '../../../../templates/email') },
            locals: {
              content: {
                ...context,
                baseUrl,
                event: {
                  ...event,
                  isLocationAValidURL: false,
                  isLocationAnAbsoluteURL: false
                },
                seeInCalendarLink: eventInCalendar
              },
              translate
            }
          }));
          expect(sendWithCustomTemplateFunctionStub.getCall(0).args[0].templateFn(untransformedMJML)).to.equal(html);
          done();
        })
        .catch(err => done(err || new Error('should resolve')));
    });

    it('should send email with the provided custom template function', function(done) {
      esnConfig = config => {
        expect(config).to.equal('datetime');

        return {
          inModule: module => {
            expect(module).to.equal('core');

            return {
              forUser: (whichUser, isUserWide) => {
                expect(whichUser).to.equal(user);
                expect(isUserWide).to.be.true;

                return {
                  get: (...args) => {
                    expect(args).to.be.deep.equal([]);

                    return {
                      timeZone: 'Asia/Ho_Chi_Minh',
                      use24hourFormat: true
                    };
                  }
                };
              }
            };
          }
        };
      };

      this.moduleHelpers.addDep('esn-config', esnConfig);

      const html = '<span>whatever</span>';
      const untransformedMarkup = 'span whatever';
      const templateFn = toBeTransformedMarkup => {
        expect(toBeTransformedMarkup).to.equal(untransformedMarkup);

        return html;
      };

      this.requireModule().sendWithCustomTemplateFunction({ ...payload, templateFn })
        .then(() => {
          expect(helpers.config.getBaseUrl).to.have.been.calledWith(null);
          expect(linksHelper.getEventInCalendar).to.have.been.calledWith(ics);
          expect(userModule.findByEmail).to.have.been.calledWith(to);
          expect(i18nModule.getI18nForMailer).to.have.been.calledWith(user);
          expect(jcalHelper.jcal2content).to.have.been.calledWith(ics, baseUrl);
          expect(jcalHelper.getIcalEvent).to.have.been.calledWith(ics);
          expect(jcalHelper.getIcalDateAsMoment.getCall(0).args[0]).to.equal(icalEvent.startDate);
          expect(jcalHelper.getIcalDateAsMoment.getCall(1).args[0]).to.equal(icalEvent.endDate);
          expect(getContentEventStartAndEndStub).to.have.been.calledWith({
            start: startDateAsMoment,
            end: endDateAsMoment,
            isAllDay: false,
            timezone: 'Asia/Ho_Chi_Minh',
            use24hourFormat: true,
            locale
          });
          expect(urlHelper.isValidURL).to.have.been.calledWith(event.location);
          expect(urlHelper.isAbsoluteURL).to.have.been.calledWith(event.location);
          expect(emailModule.getMailer).to.have.been.calledWith(user);
          expect(sendWithCustomTemplateFunctionStub).to.have.been.calledWith(sinon.match({
            message: {
              encoding: 'base64',
              from,
              to,
              subject: 'translated',
              headers: {}
            },
            template: { name: emailTemplateName, path: path.resolve(__dirname, '../../../../templates/email') },
            locals: {
              content: {
                ...context,
                baseUrl,
                event: {
                  ...event,
                  isLocationAValidURL: false,
                  isLocationAnAbsoluteURL: false
                },
                seeInCalendarLink: eventInCalendar
              },
              translate
            }
          }));
          expect(sendWithCustomTemplateFunctionStub.getCall(0).args[0].templateFn(untransformedMarkup)).to.equal(html);
          done();
        })
        .catch(err => done(err || new Error('should resolve')));
    });

    it('should be able to send emails to multiple recipients', function(done) {
      const anotherUser = { _id: 'recipient-user-id', preferredEmail: 'recipient-user@test.org' };
      let esnConfigCallCount = 0;

      esnConfig = config => {
        expect(config).to.equal('datetime');

        return {
          inModule: module => {
            expect(module).to.equal('core');

            return {
              forUser: (whichUser, isUserWide) => {
                if (esnConfigCallCount === 0) {
                  expect(whichUser).to.equal(anotherUser);
                } else {
                  expect(whichUser).to.equal(user);
                }

                expect(isUserWide).to.be.true;

                esnConfigCallCount++;

                return {
                  get: (...args) => {
                    expect(args).to.be.deep.equal([]);

                    return {
                      timeZone: 'Asia/Ho_Chi_Minh',
                      use24hourFormat: true
                    };
                  }
                };
              }
            };
          }
        };
      };

      this.moduleHelpers.addDep('esn-config', esnConfig);

      const html = '<span>whatever</span>';
      const untransformedMJML = '<mjml-span>whatever</mjml-span>';
      mockery.registerMock('mjml', mjml => {
        expect(mjml).to.equal(untransformedMJML);

        return { html };
      });

      this.requireModule().sendWithCustomTemplateFunction({ ...payload, to: [anotherUser, to] })
        .then(() => {
          expect(helpers.config.getBaseUrl).to.have.been.calledWith(null);
          expect(linksHelper.getEventInCalendar).to.have.been.calledWith(ics);
          expect(userModule.findByEmail).to.have.been.calledWith(to);
          expect(i18nModule.getI18nForMailer.getCall(0).args[0]).to.deep.equal(anotherUser);
          expect(i18nModule.getI18nForMailer.getCall(1).args[0]).to.deep.equal(user);
          expect(jcalHelper.jcal2content).to.have.been.calledTwice;
          expect(jcalHelper.jcal2content).to.have.been.calledWith(ics, baseUrl);
          expect(jcalHelper.getIcalEvent).to.have.been.calledTwice;
          expect(jcalHelper.getIcalEvent).to.have.been.calledWith(ics);
          expect(jcalHelper.getIcalDateAsMoment.getCall(0).args[0]).to.equal(icalEvent.startDate);
          expect(jcalHelper.getIcalDateAsMoment.getCall(1).args[0]).to.equal(icalEvent.endDate);
          expect(jcalHelper.getIcalDateAsMoment.getCall(2).args[0]).to.equal(icalEvent.startDate);
          expect(jcalHelper.getIcalDateAsMoment.getCall(3).args[0]).to.equal(icalEvent.endDate);
          expect(getContentEventStartAndEndStub).to.have.been.calledTwice;
          expect(getContentEventStartAndEndStub).to.have.been.calledWith({
            start: startDateAsMoment,
            end: endDateAsMoment,
            isAllDay: false,
            timezone: 'Asia/Ho_Chi_Minh',
            use24hourFormat: true,
            locale
          });
          expect(urlHelper.isValidURL).to.have.been.calledTwice;
          expect(urlHelper.isValidURL).to.have.been.calledWith(event.location);
          expect(urlHelper.isAbsoluteURL).to.have.been.calledTwice;
          expect(urlHelper.isAbsoluteURL).to.have.been.calledWith(event.location);
          expect(emailModule.getMailer.getCall(0).args[0]).to.deep.equal(anotherUser);
          expect(emailModule.getMailer.getCall(1).args[0]).to.deep.equal(user);
          expect(sendWithCustomTemplateFunctionStub.getCall(0).args[0].message).to.deep.equal({
            encoding: 'base64',
            from,
            to: anotherUser.preferredEmail,
            subject: 'translated',
            headers: {}
          });
          expect(sendWithCustomTemplateFunctionStub.getCall(0).args[0].template).to.deep.equal({
            name: emailTemplateName, path: path.resolve(__dirname, '../../../../templates/email')
          });
          expect(sendWithCustomTemplateFunctionStub.getCall(0).args[0].locals).to.deep.equal({
            content: {
              ...context,
              baseUrl,
              event: {
                ...event,
                isLocationAValidURL: false,
                isLocationAnAbsoluteURL: false
              },
              seeInCalendarLink: eventInCalendar
            },
            translate
          });
          expect(sendWithCustomTemplateFunctionStub.getCall(0).args[0].templateFn(untransformedMJML)).to.equal(html);
          expect(sendWithCustomTemplateFunctionStub.getCall(1).args[0].message).to.deep.equal({
            encoding: 'base64',
            from,
            to,
            subject: 'translated',
            headers: {}
          });
          expect(sendWithCustomTemplateFunctionStub.getCall(1).args[0].template).to.deep.equal({
            name: emailTemplateName, path: path.resolve(__dirname, '../../../../templates/email')
          });
          expect(sendWithCustomTemplateFunctionStub.getCall(1).args[0].locals).to.deep.equal({
            content: {
              ...context,
              baseUrl,
              event: {
                ...event,
                isLocationAValidURL: false,
                isLocationAnAbsoluteURL: false
              },
              seeInCalendarLink: eventInCalendar
            },
            translate
          });
          expect(sendWithCustomTemplateFunctionStub.getCall(1).args[0].templateFn(untransformedMJML)).to.equal(html);
          done();
        })
        .catch(err => done(err || new Error('should resolve')));
    });
  });
});
