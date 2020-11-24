const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');

describe('The invitation email module', function() {
  let userMock, domainMock, helpersMock, authMock, emailMock, esnConfigMock;
  let getModule;
  const method = 'REPLY';

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

    domainMock = {
      load: function(domainId, callback) {
        callback(null, { _id: 'domainId '});
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

    esnConfigMock = function(confName) {
      expect(confName).to.equal('language');

      return {
        inModule: function(mod) {
          expect(mod).to.equal('core');

          return {
            forUser: () => {}
          };
        }
      };
    };

    this.moduleHelpers.addDep('user', userMock);
    this.moduleHelpers.addDep('domain', domainMock);
    this.moduleHelpers.addDep('helpers', helpersMock);
    this.moduleHelpers.addDep('auth', authMock);
    this.moduleHelpers.addDep('email', emailMock);
    this.moduleHelpers.addDep('esn-config', esnConfigMock);
    this.moduleHelpers.addDep('i18n', this.helpers.requireBackend('core/i18n'));

    getModule = () => require(`${this.moduleHelpers.backendPath}/lib/invitation/email`)(this.moduleHelpers.dependencies);
  });

  describe('The replyFromExternalUser function', function() {
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
    const externalAttendeeEmail = 'externalAttendee@open-paas.org';
    const ics = [
      'BEGIN:VCALENDAR',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      'UID:123123',
      'SUMMARY:description',
      'DTSTART:20150101T010101',
      'DTEND:20150101T020202',
      'ORGANIZER;CN="' + organizer.firstname + ' ' + organizer.lastname + '":mailto:' + organizer.preferredEmail,
      'ATTENDEE;CN="' + externalAttendeeEmail.firstname + ' ' + externalAttendeeEmail.lastname + '":mailto:' + externalAttendeeEmail,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    it('should return an error if editorEmail is undefined', function(done) {
      getModule().replyFromExternalUser({ editorEmail: null, recipientEmail: 'foo@bar.com', method, ics: 'ICS', calendarURI: 'calendarURI'}).then(done, () => done());
    });

    it('should return an error if attendeeEmails is not an email string', function(done) {
      getModule().replyFromExternalUser({ editorEmail: externalAttendeeEmail, recipientEmail: {}, method, ics: 'ICS', calendarURI: 'calendarURI' }).then(done, () => done());
    });

    it('should return an error if attendeeEmails is null object', function(done) {
      getModule().replyFromExternalUser({ editorEmail: externalAttendeeEmail, recipientEmail: null, method, ics: 'ICS', calendarURI: 'calendarURI' }).then(done, () => done());
    });

    it('should return an error if method is undefined', function(done) {
      getModule().replyFromExternalUser({ editorEmail: externalAttendeeEmail, recipientEmail: 'foo@bar.com', method: null, ics: 'ICS', calendarURI: 'calendarURI'}).then(done, () => done());
    });

    it('should return an error if ics is undefined', function(done) {
      getModule().replyFromExternalUser({ editorEmail: externalAttendeeEmail, recipientEmail: 'foo@bar.com', method, ics: null, calendarURI: 'calendarURI' }).then(done, () => done());
    });

    it('should return an error if calendarURI is undefined', function(done) {
      getModule().replyFromExternalUser({ editorEmail: externalAttendeeEmail, recipientEmail: 'foo@bar.com', method, ics: 'ICS', calendarURI: null}).then(done, () => done());
    });

    it('should return an error if findByEmail return an error', function(done) {
      userMock.findByEmail = function(email, callback) {
        callback(new Error('Error in findByEmail'));
      };

      getModule().replyFromExternalUser({ editorEmail: externalAttendeeEmail, recipientEmail: organizer.preferredEmail, method, ics, calendarURI: 'calendarURI'}).then(done, () => done());
    });

    it('should return an error it cannot retrieve base url', function(done) {
      helpersMock.config.getBaseUrl = function(user, callback) {
        callback(new Error('cannot get base_url'));
      };

      getModule().replyFromExternalUser({ editorEmail: externalAttendeeEmail, recipientEmail: organizer.preferredEmail, method, ics, calendarURI: 'calendarURI'}).then(done, () => done());
    });

    it('should return an error if an error happens during links generation', function(done) {
      userMock.findByEmail = function(email, callback) {
        return callback(null, organizer);
      };

      authMock.jwt.generateWebToken = function(p, callback) {
        return callback(new Error());
      };

      getModule().replyFromExternalUser({ editorEmail: externalAttendeeEmail, recipientEmail: organizer.preferredEmail, method, ics, calendarURI: 'calendarURI'}).then(done, () => done());
    });

    it('should generate a token with proper information', function(done) {
      userMock.findByEmail = function(email, callback) {
        callback(null, organizer);
      };

      emailMock.getMailer = () => ({sendHTML: () => Promise.resolve()});

      authMock.jwt.generateWebToken = sinon.spy(function(token, callback) {
        callback(null, 'a_token');
      });

      getModule().replyFromExternalUser({ editorEmail: externalAttendeeEmail, recipientEmail: organizer.preferredEmail, method, ics, calendarURI: 'calendarURI'})
        .then(() => {
          ['ACCEPTED', 'DECLINED', 'TENTATIVE'].forEach(action => testTokenWith(action, externalAttendeeEmail));

          done();
        })
        .catch(done);

      function testTokenWith(action) {
        expect(authMock.jwt.generateWebToken).to.have.been.calledWith({
          action: action,
          attendeeEmail: organizer.preferredEmail,
          calendarURI: 'calendarURI',
          organizerEmail: organizer.preferredEmail,
          uid: '123123'
        });
      }
    });

    it('should return an error if there is an error while sending email', function(done) {
      userMock.findByEmail = function(email, callback) {
        callback(null, organizer);
      };

      emailMock.getMailer = function() {
        return {
          sendHTML: function() {
            return Promise.reject(new Error('an error'));
          }
        };
      };

      getModule().replyFromExternalUser({ editorEmail: externalAttendeeEmail, recipientEmail: organizer.preferredEmail, method, ics, calendarURI: 'calendarURI'}).then(done, () => done());
    });

    it('should work even if findByEmail doesn\'t find the recipient', function(done) {
      userMock.findByEmail = function(email, callback) {
        callback(null, null);
      };

      emailMock.getMailer = function() {
        return {
          sendHTML: function(email, template, locals) {
            expect(email.from).to.be.undefined;
            expect(email.to).to.equal(organizer.preferredEmail);
            expect(template).to.be.a.string;
            expect(locals).to.be.an('object');

            return Promise.resolve();
          }
        };
      };

      getModule().replyFromExternalUser({ editorEmail: externalAttendeeEmail, recipientEmail: organizer.preferredEmail, method, ics, calendarURI: 'calendarURI'}).then(done, done);
    });

    it('should not send an email if the recipient is not involved in the event', function(done) {
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

      getModule().replyFromExternalUser({ editorEmail: externalAttendeeEmail, recipientEmail: emailAttendeeNotInvited, method, ics, calendarURI: 'calendarURI'})
        .then(() => done())
        .catch(err => {
          expect(err.message).to.match(/The recipient is not involved in the event/);
          expect(sendHTML).to.not.have.been.called;
          done();
        });
    });

    it('should send HTML email with correct parameters', function(done) {
      helpersMock.config.getBaseUrl = function(user, callback) {
        callback(null, 'http://localhost:8888');
      };

      userMock.findByEmail = function(email, callback) {
        return callback(null, organizer);
      };

      emailMock.getMailer = function() {
        return {
          sendHTML: function(email, template, locals) {
            expect(email.from).to.be.undefined;

            expect(email.to).to.equal(organizer.preferredEmail);
            expect(email).to.shallowDeepEqual({
              subject: 'Participation updated: description',
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
            expect(template.name).to.equal('event.reply');
            expect(template.path).to.match(/templates\/email/);
            expect(locals).to.be.an('object');
            expect(locals.filter).is.a.function;
            expect(locals.content.method).to.equal(method);
            expect(locals.content.seeInCalendarLink).to.be.defined;
            expect(locals.content.baseUrl).to.equal('http://localhost:8888');
            expect(locals.content.yes).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token');
            expect(locals.content.no).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token');
            expect(locals.content.maybe).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token');

            return Promise.resolve();
          }
        };
      };
      getModule().replyFromExternalUser({
        editorEmail: externalAttendeeEmail,
        recipientEmail: organizer.preferredEmail,
        method,
        ics,
        calendarURI: 'calendarURI',
        domain: null
      }).then(() => done(), done);
    });

    it('should not include calendar link when attendee is external user', function(done) {
      helpersMock.config.getBaseUrl = function(user, callback) {
        callback(null, 'http://localhost:8888');
      };

      userMock.findByEmail = function(email, callback) {
        return callback();
      };

      emailMock.getMailer = function() {
        return {
          sendHTML: function(email, template, locals) {
            expect(email.from).to.be.undefined;

            expect(email.to).to.equal(organizer.preferredEmail);
            expect(email).to.shallowDeepEqual({
              subject: 'Participation updated: description',
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
            expect(template.name).to.equal('event.reply');
            expect(template.path).to.match(/templates\/email/);
            expect(locals).to.be.an('object');
            expect(locals.filter).is.a.function;
            expect(locals.content.seeInCalendarLink).to.not.be.defined;
            expect(locals.content.method).to.equal(method);

            return Promise.resolve();
          }
        };
      };

      getModule().replyFromExternalUser({
        editorEmail: externalAttendeeEmail,
        recipientEmail: organizer.preferredEmail,
        method,
        ics,
        calendarURI: 'calendarURI',
        domain: null
      }).then(() => done(), done);
    });

    it('should send email with reply event subject and template', function(done) {
      const ics = fs.readFileSync(__dirname + '/../../../fixtures/reply.ics', 'utf-8');

      userMock.findByEmail = function(email, callback) {
        callback(null, organizer);
      };

      emailMock.getMailer = function() {
        return {
          sendHTML: function(email, template) {
            expect(template.name).to.equal('event.reply');
            expect(template.path).to.match(/templates\/email/);
            expect(email.subject).to.equal(`Accepted: Démo OPENPAAS (${externalAttendeeEmail})`);

            return Promise.resolve();
          }
        };
      };

      getModule().replyFromExternalUser({
        editorEmail: externalAttendeeEmail,
        recipientEmail: organizer.preferredEmail,
        method,
        ics,
        calendarURI: 'calendarURI'
      }).then(() => done(), done);
    });

    it('should send email with correct content', function(done) {
      const ics = fs.readFileSync(__dirname + '/../../../fixtures/reply.ics', 'utf-8');

      userMock.findByEmail = function(email, callback) {
        callback(null, organizer);
      };

      const editor = {
        displayName: externalAttendeeEmail,
        email: externalAttendeeEmail
      };

      emailMock.getMailer = function() {
        return {
          sendHTML: function(email, template, locals) {
            expect(template.name).to.equal('event.reply');
            expect(template.path).to.match(/templates\/email/);
            expect(email.subject).to.equal(`Accepted: Démo OPENPAAS (${externalAttendeeEmail})`);
            expect(locals.content.editor).to.deep.equal(editor);

            return Promise.resolve();
          }
        };
      };

      getModule().replyFromExternalUser({
        editorEmail: externalAttendeeEmail,
        recipientEmail: organizer.preferredEmail,
        method,
        ics,
        calendarURI: 'calendarURI'
      }).then(() => done(), done);
    });

    it('should only send messages to involved users', function(done) {
      let called = 0;
      const ics = fs.readFileSync(__dirname + '/../../../fixtures/involved.ics', 'utf-8');

      userMock.findByEmail = function(email, callback) {
        callback(null, organizer);
      };

      emailMock.getMailer = function() {
        return {
          sendHTML: function(email) {
            called++;
            if (called === 1) {
              expect(email.to).to.deep.equal(organizer.preferredEmail);
            }

            return Promise.resolve();
          }
        };
      };

      getModule().replyFromExternalUser({
        editorEmail: externalAttendeeEmail,
        recipientEmail: organizer.preferredEmail,
        method,
        ics,
        calendarURI: 'calendarURI'
      }).then(() => {
        expect(called).to.equal(1);
        done();
      }, done);
    });
  });
});
