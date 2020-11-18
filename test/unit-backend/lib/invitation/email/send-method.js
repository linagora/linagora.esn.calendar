const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const mockery = require('mockery');

describe('The invitation email module', function() {
  let userMock, helpersMock, authMock, emailMock, esnConfigMock, datetimeOptions;
  let getModule;

  beforeEach(function() {
    authMock = {
      jwt: {
        generateWebToken: function(p, callback) {
          expect(p).to.exist;
          callback(null, 'token');
        }
      }
    };

    userMock = {
      getDisplayName: user => user.firstname + ' ' + user.lastname,
      _user: {},
      _err: null,
      get: function(id, callback) {
        return callback(this._err, this._user);
      },
      findByEmail: function(email, callback) {
        return callback(this._err, this._user);
      }
    };

    helpersMock = {
      message: {
        messageSharesToTimelineTarget: function() {}
      },
      array: {
        isNullOrEmpty: function(array) {
          return (!Array.isArray(array) || array.length === 0);
        }
      },
      config: {
        getBaseUrl: function(user, callback) {
          callback();
        }
      }
    };

    emailMock = {
      getMailer: function() { return {}; }
    };

    datetimeOptions = {
      timeZone: 'UTC'
    };

    esnConfigMock = function(confName) {
      return {
        inModule: function(mod) {
          expect(mod).to.equal('core');

          if (confName === 'language') {
            return {
              forUser: () => {}
            };
          }

          return {
            forUser: () => ({
              get: () => Promise.resolve(datetimeOptions)
            })
          };
        }
      };
    };

    this.moduleHelpers.addDep('user', userMock);
    this.moduleHelpers.addDep('helpers', helpersMock);
    this.moduleHelpers.addDep('auth', authMock);
    this.moduleHelpers.addDep('email', emailMock);
    this.moduleHelpers.addDep('esn-config', esnConfigMock);
    this.moduleHelpers.addDep('i18n', this.helpers.requireBackend('core/i18n'));

    getModule = () => require(`${this.moduleHelpers.backendPath}/lib/invitation/email`)(this.moduleHelpers.dependencies);
  });

  describe('The send function', function() {
    const organizer = {
      firstname: 'organizerFirstname',
      lastname: 'organizerLastname',
      emails: [
        'organizer@open-paas.org'
      ],
      preferredEmail: 'organizer@open-paas.org',
      email: 'organizer@open-paas.org',
      domains: [{ domain_id: 'domain123' }]
    };
    const attendee1 = {
      firstname: 'attendee1Firstname',
      lastname: 'attendee1Lastname',
      emails: [
        'attendee1@open-paas.org'
      ]
    };
    const otherAttendee = {
      firstname: 'attendee2Firstname',
      lastname: 'attendee2Lastname',
      emails: [
        'attendee2@open-paas.org'
      ]
    };
    const attendeeEmail = attendee1.emails[0];

    const ics = [
      'BEGIN:VCALENDAR',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      'UID:123123',
      'SUMMARY:description',
      'DTSTART:20150101T010101',
      'DTEND:20150101T020202',
      'ORGANIZER;CN="' + organizer.firstname + ' ' + organizer.lastname + '":mailto:' + organizer.emails[0],
      'ATTENDEE;CN="' + attendee1.firstname + ' ' + attendee1.lastname + '":mailto:' + attendee1.emails[0],
      'ATTENDEE;CN="' + otherAttendee.firstname + ' ' + otherAttendee.lastname + '":mailto:' + otherAttendee.emails[0],
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const newEvent = true;

    describe('The inviteAttendees fn', function() {
      it('should return an error if organizer is undefined', function(done) {
        getModule().send({ sender: null, recipientEmail: 'foo@bar.com', method: 'REQUEST', ics: 'ICS', calendarURI: 'calendarURI'}).then(done, () => done());
      });

      it('should return an error if attendeeEmails is not an email string', function(done) {
        getModule().send({ sender: {}, recipientEmail: {}, method: 'REQUEST', ics: 'ICS', calendarURI: 'calendarURI' }).then(done, () => done());
      });

      it('should return an error if attendeeEmails is null object', function(done) {
        getModule().send({ sender: organizer, recipientEmail: null, method: 'REQUEST', ics: 'ICS', calendarURI: 'calendarURI' }).then(done, () => done());
      });

      it('should return an error if method is undefined', function(done) {
        getModule().send({ sender: {}, recipientEmail: 'foo@bar.com', method: null, ics: 'ICS', calendarURI: 'calendarURI'}).then(done, () => done());
      });

      it('should return an error if ics is undefined', function(done) {
        getModule().send({ sender: {}, recipientEmail: 'foo@bar.com', method: 'REQUEST', ics: null, calendarURI: 'calendarURI' }).then(done, () => done());
      });

      it('should return an error if calendarURI is undefined', function(done) {
        getModule().send({ sender: {}, recipientEmail: 'foo@bar.com', method: 'REQUEST', ics: 'ICS', calendarURI: null}).then(done, () => done());
      });

      it('should return an error if findByEmail return an error', function(done) {
        userMock.findByEmail = function(email, callback) {
          callback(new Error('Error in findByEmail'));
        };

        getModule().send({ sender: organizer, recipientEmail: attendeeEmail, method: 'REQUEST', ics, calendarURI: 'calendarURI'}).then(done, () => done());
      });

      it('should return an error it cannot retrieve base url', function(done) {
        helpersMock.config.getBaseUrl = function(user, callback) {
          callback(new Error('cannot get base_url'));
        };

        getModule().send({ sender: organizer, recipientEmail: attendeeEmail, method: 'REQUEST', ics, calendarURI: 'calendarURI'}).then(done, () => done());
      });

      it('should return an error if an error happens during links generation', function(done) {
        userMock.findByEmail = function(email, callback) {
          if (email === attendee1.emails[0]) {
            return callback(null, attendee1);
          }

          return callback(null, otherAttendee);
        };

        authMock.jwt.generateWebToken = function(p, callback) {
          return callback(new Error());
        };

        getModule().send({ sender: organizer, recipientEmail: attendeeEmail, method: 'REQUEST', ics, calendarURI: 'calendarURI'}).then(done, () => done());
      });

      it('should generate a token with proper information', function(done) {
        userMock.findByEmail = function(email, callback) {
          if (email === attendee1.emails[0]) {
            return callback(null, attendee1);
          }
          callback(null, otherAttendee);
        };

        emailMock.getMailer = () => ({sendHTML: () => Promise.resolve()});

        authMock.jwt.generateWebToken = sinon.spy(function(token, callback) {
          callback(null, 'a_token');
        });

        getModule().send({ sender: organizer, recipientEmail: attendeeEmail, method: 'REQUEST', ics, calendarURI: 'calendarURI'})
          .then(() => {
            ['ACCEPTED', 'DECLINED', 'TENTATIVE'].forEach(action => testTokenWith(action, attendeeEmail));

            done();
          })
          .catch(done);

        function testTokenWith(action, attendeeEmail) {
          expect(authMock.jwt.generateWebToken).to.have.been.calledWith({
            action: action,
            attendeeEmail: attendeeEmail,
            calendarURI: 'calendarURI',
            organizerEmail: organizer.preferredEmail,
            uid: '123123'
          });
        }
      });

      it('should return an error if there is an error while sending email', function(done) {
        userMock.findByEmail = function(email, callback) {
          if (email === attendee1.emails[0]) {
            return callback(null, attendee1);
          }
          callback(null, otherAttendee);
        };

        emailMock.getMailer = function() {
          return {
            sendHTML: function() {
              return Promise.reject(new Error('an error'));
            }
          };
        };

        getModule().send({ sender: organizer, recipientEmail: attendeeEmail, method: 'REQUEST', ics, calendarURI: 'calendarURI'}).then(done, () => done());
      });

      it('should work even if findByEmail doesn\'t find the attendee', function(done) {
        userMock.findByEmail = function(email, callback) {
          if (email === attendee1.emails[0]) {
            return callback(null, attendee1);
          }
          // Purposely not finding this attendee
          callback(null, null);
        };

        emailMock.getMailer = function() {
          return {
            sendHTML: function(email, template, locals) {
              expect(email.from).to.equal(organizer.emails[0]);
              expect(email.to).to.equal(attendee1.emails[0]);
              expect(template).to.be.a.string;
              expect(locals).to.be.an('object');

              return Promise.resolve();
            }
          };
        };

        getModule().send({ sender: organizer, recipientEmail: attendeeEmail, method: 'REQUEST', ics, calendarURI: 'calendarURI'}).then(done, done);
      });

      it('should not send an email if the attendee is not involved in the event', function(done) {
        const emailAttendeeNotInvited = 'toto@open-paas.org';
        const sendHTML = sinon.spy();

        userMock.findByEmail = function(email, callback) {
          callback();
        };

        emailMock.getMailer = function() {
          return {
            sendHTML
          };
        };

        getModule().send({ sender: organizer, recipientEmail: emailAttendeeNotInvited, method: 'REQUEST', ics, calendarURI: 'calendarURI'})
          .then(() => done())
          .catch(err => {
            expect(err.message).to.match(/The recipient is not involved in the event/);
            expect(sendHTML).to.not.have.been.called;
            done();
          });
      });

      it('should send HTML email with correct parameters when the editor is an internal user', function(done) {
        const method = 'REQUEST';
        const attendeeEditor = {
          firstname: 'attendeeFistname',
          lastname: 'attendeeLastname',
          emails: ['attendee1@open-paas.org'],
          preferredEmail: 'attendee1@open-paas.org',
          domains: [{ domains_id: 'domain123' }]
        };

        helpersMock.config.getBaseUrl = function(user, callback) {
          callback(null, 'http://localhost:8888');
        };

        userMock.findByEmail = function(email, callback) {
          if (email === attendee1.emails[0]) {
            return callback(null, attendee1);
          }
          callback(null, otherAttendee);
        };

        emailMock.getMailer = function() {
          return {
            sendHTML: function(email, template, locals) {
              expect(email.from).to.equal(attendeeEditor.emails[0]);
              expect(email.to).to.equal(organizer.preferredEmail);
              expect(email).to.shallowDeepEqual({
                subject: 'New event from ' + organizer.firstname + ' ' + organizer.lastname + ': description',
                encoding: 'base64',
                alternatives: [{
                  content: ics,
                  contentType: `text/calendar; charset=UTF-8; method=${method}`
                }],
                attachments: [{
                  filename: 'meeting.ics',
                  content: ics,
                  contentType: 'application/ics'
                }]
              });
              expect(template.name).to.equal('event.invitation');
              expect(template.path).to.match(/templates\/email/);
              expect(locals.filter).is.a.function;
              expect(locals.content.method).to.equal(method);
              expect(locals.content.baseUrl).to.equal('http://localhost:8888');
              expect(locals.content.yes).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token&eventUid=123123');
              expect(locals.content.no).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token&eventUid=123123');
              expect(locals.content.maybe).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token&eventUid=123123');

              return Promise.resolve();
            }
          };
        };

        getModule().send({
          sender: attendeeEditor,
          recipientEmail: organizer.preferredEmail,
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          newEvent
        }).then(() => done(), done);
      });

      it('should send HTML email with correct parameters for internal users', function(done) {
        const method = 'REQUEST';

        helpersMock.config.getBaseUrl = function(user, callback) {
          callback(null, 'http://localhost:8888');
        };

        userMock.findByEmail = function(email, callback) {
          return callback(null, (email === attendee1.emails[0]) ? attendee1 : otherAttendee);
        };

        emailMock.getMailer = function() {
          return {
            sendHTML: function(email, template, locals) {
              expect(email.from).to.equal(organizer.emails[0]);

              expect(email.to).to.equal(attendee1.emails[0]);
              expect(email).to.shallowDeepEqual({
                subject: 'New event from ' + organizer.firstname + ' ' + organizer.lastname + ': description',
                encoding: 'base64',
                alternatives: [{
                  content: ics,
                  contentType: `text/calendar; charset=UTF-8; method=${method}`
                }],
                attachments: [{
                  filename: 'meeting.ics',
                  content: ics,
                  contentType: 'application/ics'
                }]
              });
              expect(template.name).to.equal('event.invitation');
              expect(template.path).to.match(/templates\/email/);
              expect(locals).to.be.an('object');
              expect(locals.filter).is.a.function;
              expect(locals.content.method).to.equal(method);
              expect(locals.content.seeInCalendarLink).to.be.defined;
              expect(locals.content.baseUrl).to.equal('http://localhost:8888');
              expect(locals.content.yes).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token&eventUid=123123');
              expect(locals.content.no).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token&eventUid=123123');
              expect(locals.content.maybe).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token&eventUid=123123');

              return Promise.resolve();
            }
          };
        };
        getModule().send({
          sender: organizer,
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          newEvent
        }).then(() => done(), done);
      });

      it('should send HTML email with correct parameters for external users', function(done) {
        const method = 'REQUEST';

        helpersMock.config.getBaseUrl = function(user, callback) {
          callback(null, 'http://localhost:8888');
        };

        userMock.findByEmail = function(email, callback) {
          return callback();
        };

        emailMock.getMailer = function() {
          return {
            sendHTML: function(email, template, locals) {
              expect(email.from).to.equal(organizer.emails[0]);

              expect(email.to).to.equal(attendee1.emails[0]);
              expect(email).to.shallowDeepEqual({
                subject: 'New event from ' + organizer.firstname + ' ' + organizer.lastname + ': description',
                encoding: 'base64',
                alternatives: [{
                  content: ics,
                  contentType: `text/calendar; charset=UTF-8; method=${method}`
                }],
                attachments: [{
                  filename: 'meeting.ics',
                  content: ics,
                  contentType: 'application/ics'
                }]
              });
              expect(template.name).to.equal('event.invitation');
              expect(template.path).to.match(/templates\/email/);
              expect(locals).to.be.an('object');
              expect(locals.filter).is.a.function;
              expect(locals.content.method).to.equal(method);
              expect(locals.content.seeInCalendarLink).to.be.defined;
              expect(locals.content.baseUrl).to.equal('http://localhost:8888');
              expect(locals.content.yes).to.equal('http://localhost:8888/excal/?jwt=token&eventUid=123123');
              expect(locals.content.no).to.equal('http://localhost:8888/excal/?jwt=token&eventUid=123123');
              expect(locals.content.maybe).to.equal('http://localhost:8888/excal/?jwt=token&eventUid=123123');

              return Promise.resolve();
            }
          };
        };

        getModule().send({
          sender: organizer,
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          newEvent
        })
          .then(done)
          .catch(err => done(err || new Error('should resolve')));
      });

      it('should not include calendar link when attendee is external user', function(done) {
        const method = 'REQUEST';

        helpersMock.config.getBaseUrl = function(user, callback) {
          callback(null, 'http://localhost:8888');
        };

        userMock.findByEmail = function(email, callback) {
          return callback();
        };

        emailMock.getMailer = function() {
          return {
            sendHTML: function(email, template, locals) {
              expect(email.from).to.equal(organizer.emails[0]);

              expect(email.to).to.equal(attendeeEmail);
              expect(email).to.shallowDeepEqual({
                subject: 'New event from ' + organizer.firstname + ' ' + organizer.lastname + ': description',
                encoding: 'base64',
                alternatives: [{
                  content: ics,
                  contentType: `text/calendar; charset=UTF-8; method=${method}`
                }],
                attachments: [{
                  filename: 'meeting.ics',
                  content: ics,
                  contentType: 'application/ics'
                }]
              });
              expect(template.name).to.equal('event.invitation');
              expect(template.path).to.match(/templates\/email/);
              expect(locals).to.be.an('object');
              expect(locals.filter).is.a.function;
              expect(locals.content.seeInCalendarLink).to.not.be.defined;
              expect(locals.content.method).to.equal(method);

              return Promise.resolve();
            }
          };
        };

        getModule().send({
          sender: organizer,
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          newEvent
        }).then(() => done(), done);
      });

      it('should use the attendee\'s timezone and locale configuration if the attendee is an internal user', function(done) {
        const method = 'REQUEST';
        const datetimeHelpersMock = {
          formatDatetime: sinon.stub()
        };

        datetimeHelpersMock.formatDatetime.onCall(0).returns({ date: '01/01/2015', time: '01:01' });
        datetimeHelpersMock.formatDatetime.onCall(1).returns({ date: '01/01/2015', time: '02:02' });

        datetimeOptions = {
          timeZone: 'Asia/Shanghai',
          use24hourFormat: true
        };

        mockery.registerMock('./../i18n', () => ({
          getI18nForMailer: user => {
            expect(user).to.equal(attendee1);

            return Promise.resolve({
              i18n: {
                __: ({ phrase }) => phrase
              },
              locale: 'zh',
              translate: text => text
            });
          }
        }));

        mockery.registerMock('../helpers/datetime', () => datetimeHelpersMock);

        esnConfigMock = function() {
          return {
            inModule: function(mod) {
              expect(mod).to.equal('core');

              return {
                forUser: (user, isUserWide) => {
                  expect(user).to.equal(attendee1);
                  expect(isUserWide).to.be.true;

                  return {
                    get: () => Promise.resolve(datetimeOptions)
                  };
                }
              };
            }
          };
        };

        this.moduleHelpers.addDep('esn-config', esnConfigMock);

        helpersMock.config.getBaseUrl = function(user, callback) {
          callback(null, 'http://localhost:8888');
        };

        userMock.findByEmail = function(email, callback) {
          return callback(null, attendee1);
        };

        emailMock.getMailer = function() {
          return {
            sendHTML: function(email, template, locals) {
              expect(email.from).to.equal(organizer.emails[0]);

              expect(email.to).to.equal(attendeeEmail);
              expect(email).to.shallowDeepEqual({
                subject: 'New event from {{organizerName}}: {{& summary}}',
                encoding: 'base64',
                alternatives: [{
                  content: ics,
                  contentType: `text/calendar; charset=UTF-8; method=${method}`
                }],
                attachments: [{
                  filename: 'meeting.ics',
                  content: ics,
                  contentType: 'application/ics'
                }]
              });
              expect(template.name).to.equal('event.invitation');
              expect(template.path).to.match(/templates\/email/);
              expect(locals).to.be.an('object');
              expect(locals.filter).is.a.function;
              expect(locals.content.method).to.equal(method);
              expect(locals.content.event.start).to.deep.equal({
                date: '01/01/2015',
                time: '01:01',
                timezone: 'Asia/Shanghai'
              });
              expect(locals.content.event.end).to.deep.equal({
                date: '01/01/2015',
                time: '02:02',
                timezone: 'Asia/Shanghai'
              });

              return Promise.resolve();
            }
          };
        };

        getModule().send({
          sender: organizer,
          recipientEmail: attendee1.emails[0],
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          newEvent
        })
          .then(() => {
            const convertTzOptions = {
              timezone: datetimeOptions.timeZone,
              locale: 'zh',
              use24hourFormat: true
            };

            expect(datetimeHelpersMock.formatDatetime.getCall(0).args[1]).to.deep.equal(convertTzOptions);
            expect(datetimeHelpersMock.formatDatetime.getCall(1).args[1]).to.deep.equal(convertTzOptions);
            done();
          })
          .catch(done);
      });

      it('should use the organizer\'s timezone and locale configuration if the attendee is an external user', function(done) {
        const method = 'REQUEST';
        const datetimeHelpersMock = {
          formatDatetime: sinon.stub()
        };

        datetimeHelpersMock.formatDatetime.onCall(0).returns({ date: '01/01/2015', time: '01:01 SA' });
        datetimeHelpersMock.formatDatetime.onCall(1).returns({ date: '01/01/2015', time: '02:02 SA' });

        datetimeOptions = {
          timeZone: 'Asia/Ho_Chi_Minh'
        };

        mockery.registerMock('./../i18n', () => ({
          getI18nForMailer: user => {
            expect(user).to.be.undefined;

            return Promise.resolve({
              i18n: {
                __: ({ phrase }) => phrase
              },
              locale: 'vi',
              translate: text => text
            });
          }
        }));

        mockery.registerMock('../helpers/datetime', () => datetimeHelpersMock);

        esnConfigMock = function() {
          return {
            inModule: function(mod) {
              expect(mod).to.equal('core');

              return {
                forUser: (user, isUserWide) => {
                  expect(user).to.equal(organizer);
                  expect(isUserWide).to.be.true;

                  return {
                    get: () => Promise.resolve(datetimeOptions)
                  };
                }
              };
            }
          };
        };

        this.moduleHelpers.addDep('esn-config', esnConfigMock);

        helpersMock.config.getBaseUrl = function(user, callback) {
          callback(null, 'http://localhost:8888');
        };

        userMock.findByEmail = function(email, callback) {
          return callback();
        };

        emailMock.getMailer = function() {
          return {
            sendHTML: function(email, template, locals) {
              expect(email.from).to.equal(organizer.emails[0]);

              expect(email.to).to.equal(attendeeEmail);
              expect(email).to.shallowDeepEqual({
                subject: 'New event from {{organizerName}}: {{& summary}}',
                encoding: 'base64',
                alternatives: [{
                  content: ics,
                  contentType: `text/calendar; charset=UTF-8; method=${method}`
                }],
                attachments: [{
                  filename: 'meeting.ics',
                  content: ics,
                  contentType: 'application/ics'
                }]
              });
              expect(template.name).to.equal('event.invitation');
              expect(template.path).to.match(/templates\/email/);
              expect(locals).to.be.an('object');
              expect(locals.filter).is.a.function;
              expect(locals.content.method).to.equal(method);
              expect(locals.content.event.start).to.deep.equal({
                date: '01/01/2015',
                time: '01:01 SA',
                timezone: 'Asia/Ho_Chi_Minh'
              });
              expect(locals.content.event.end).to.deep.equal({
                date: '01/01/2015',
                time: '02:02 SA',
                timezone: 'Asia/Ho_Chi_Minh'
              });

              return Promise.resolve();
            }
          };
        };

        getModule().send({
          sender: organizer,
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          newEvent
        })
          .then(() => {
            const convertTzOptions = {
              timezone: datetimeOptions.timeZone,
              locale: 'vi',
              use24hourFormat: undefined
            };

            expect(datetimeHelpersMock.formatDatetime.getCall(0).args[1]).to.deep.equal(convertTzOptions);
            expect(datetimeHelpersMock.formatDatetime.getCall(1).args[1]).to.deep.equal(convertTzOptions);
            done();
          })
          .catch(done);
      });
    });

    describe('when method is REQUEST', function() {
      let method;

      beforeEach(function() {
        method = 'REQUEST';
      });

      it('should send email with new event subject and template if it\'s a new event for the attendee', function(done) {
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/request-new-event.ics', 'utf-8');

        userMock.findByEmail = function(email, callback) {
          return callback(null, attendee1);
        };

        emailMock.getMailer = function() {
          return {
            sendHTML: function(email, template) {
              expect(template.name).to.equal('event.invitation');
              expect(template.path).to.match(/templates\/email/);
              expect(email.subject).to.equal('New event from ' + organizer.firstname + ' ' + organizer.lastname + ': Démo OPENPAAS');

              return Promise.resolve();
            }
          };
        };

        getModule().send({
          sender: organizer,
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          newEvent
        }).then(() => done(), done);
      });

      it('should send HTML email with event update subject and template if the guest existed in the updated event', function(done) {
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/request-event-update.ics', 'utf-8');
        const newEvent = false;

        userMock.findByEmail = function(email, callback) {
          return callback(null, attendee1);
        };

        emailMock.getMailer = function() {
          return {
            sendHTML: function(email, template) {
              expect(template.name).to.equal('event.update');
              expect(template.path).to.match(/templates\/email/);
              expect(email.subject).to.equal('Event Démo OPENPAAS from ' + organizer.firstname + ' ' + organizer.lastname + ' updated');

              return Promise.resolve();
            }
          };
        };

        getModule().send({
          sender: organizer,
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          newEvent
        }).then(() => done(), done);
      });
    });

    describe('when method is REPLY', function() {
      let method;

      beforeEach(function() {
        method = 'REPLY';
      });

      it('should send email with reply event subject and template', function(done) {
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/reply.ics', 'utf-8');

        userMock.findByEmail = function(email, callback) {
          callback(null, attendee1);
        };

        emailMock.getMailer = function() {
          return {
            sendHTML: function(email, template) {
              expect(template.name).to.equal('event.reply');
              expect(template.path).to.match(/templates\/email/);
              expect(email.subject).to.equal('Accepted: Démo OPENPAAS (organizerFirstname organizerLastname)');

              return Promise.resolve();
            }
          };
        };

        getModule().send({
          sender: organizer,
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI'
        }).then(() => done(), done);
      });

      it('should send email with correct content', function(done) {
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/reply.ics', 'utf-8');

        attendee1.domains = [{ domain_id: 'domain_id' }];
        userMock.findByEmail = function(email, callback) {
          callback(null, attendee1);
        };

        const editor = {
          displayName: attendee1.firstname + ' ' + attendee1.lastname,
          email: attendee1.emails[0]
        };

        emailMock.getMailer = function() {
          return {
            sendHTML: function(email, template, locals) {
              expect(template.name).to.equal('event.reply');
              expect(template.path).to.match(/templates\/email/);
              expect(email.subject).to.equal('Participation updated: Démo OPENPAAS');
              expect(locals.content.editor).to.deep.equal(editor);

              return Promise.resolve();
            }
          };
        };

        getModule().send({
          sender: attendee1,
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI'
        }).then(() => done(), done);
      });

      it('should only send messages to involved users', function(done) {
        let called = 0;
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/involved.ics', 'utf-8');

        userMock.findByEmail = function(email, callback) {
          if (email === 'attendee1@open-paas.org') {
            return callback(null, attendee1);
          }
          callback(null, otherAttendee);
        };

        emailMock.getMailer = function() {
          return {
            sendHTML: function(email) {
              called++;
              if (called === 1) {
                expect(email.to).to.deep.equal(attendee1.emails[0]);
              }

              return Promise.resolve();
            }
          };
        };

        getModule().send({
          sender: attendee1,
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI'
        }).then(() => {
          expect(called).to.equal(1);
          done();
        }, done);
      });
    });

    describe('when method is COUNTER', function() {
      let method;

      beforeEach(function() {
        method = 'COUNTER';
      });

      it('should send email with reply event subject and template', function(done) {
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/counter.ics', 'utf-8');

        userMock.findByEmail = function(email, callback) {
          callback(null, attendee1);
        };

        emailMock.getMailer = function() {
          return {
            sendHTML: function(email, template) {
              expect(template.name).to.equal('event.counter');
              expect(template.path).to.match(/templates\/email/);
              expect(email.subject).to.equal('New changes proposed to event Démo OPENPAAS');

              return Promise.resolve();
            }
          };
        };

        getModule().send({
          sender: organizer,
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI'
        }).then(() => done(), done);
      });

      it('should send email with correct content', function(done) {
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/counter.ics', 'utf-8');

        attendee1.domains = [{ domain_id: 'domain_id' }];
        userMock.findByEmail = function(email, callback) {
          callback(null, attendee1);
        };

        const editor = {
          displayName: attendee1.firstname + ' ' + attendee1.lastname,
          email: attendee1.emails[0]
        };

        emailMock.getMailer = function() {
          return {
            sendHTML: function(email, template, locals) {
              expect(template.name).to.equal('event.counter');
              expect(template.path).to.match(/templates\/email/);
              expect(email.subject).to.equal('New changes proposed to event Démo OPENPAAS');
              expect(locals.content.event.comment).to.contains('This demo is going to be awesome!');
              expect(locals.content.editor).to.deep.equal(editor);

              return Promise.resolve();
            }
          };
        };

        getModule().send({
          sender: attendee1,
          recipientEmail: organizer.emails[0],
          method,
          ics,
          calendarURI: 'calendarURI'
        }).then(() => done(), done);
      });

      it('should only send messages to organizer', function(done) {
        let called = 0;
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/counter.ics', 'utf-8');

        userMock.findByEmail = function(email, callback) {
          if (email === 'organizer@open-paas.org') {
            return callback(null, organizer);
          }
          callback(null, otherAttendee);
        };

        emailMock.getMailer = function() {
          return {
            sendHTML: function(email) {
              called++;
              if (called === 1) {
                expect(email.to).to.deep.equal(organizer.emails[0]);
              }

              return Promise.resolve();
            }
          };
        };

        getModule().send({
          sender: attendee1,
          recipientEmail: organizer.emails[0],
          method,
          ics,
          calendarURI: 'calendarURI'
        }).then(() => {
          expect(called).to.equal(1);
          done();
        }, done);
      });
    });

    describe('when method is CANCEL', function() {
      let method;

      beforeEach(function() {
        method = 'CANCEL';
      });

      it('should send HTML email with cancel event subject', function(done) {
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/cancel.ics', 'utf-8');

        userMock.findByEmail = function(email, callback) {
          callback(null, attendee1);
        };

        emailMock.getMailer = function() {
          return {
            sendHTML: function(email, template) {
              expect(template.name).to.equal('event.cancel');
              expect(template.path).to.match(/templates\/email/);
              expect(email.subject).to.equal('Event Démo OPENPAAS from ' + organizer.firstname + ' ' + organizer.lastname + ' canceled');

              return Promise.resolve();
            }
          };
        };

        getModule().send({
          sender: organizer,
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI'
        }).then(() => done(), done);
      });
    });
  });
});
