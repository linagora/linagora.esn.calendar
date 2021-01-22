'use strict';

var expect = require('chai').expect;
var mockery = require('mockery');
var fs = require('fs');
var ICAL = require('@linagora/ical.js');
var q = require('q');
var sinon = require('sinon');

describe('The calendar controller', function() {
  let userModuleMock, invitationMock, calendarMock, helpers, forUserMock, self, esnConfigMock, userMock;
  let sendMailSpy, replyFromExternalUserMock;

  beforeEach(function() {
    self = this;

    helpers = {
      config: {
        getBaseUrl: function(user, callback) { callback(null, 'baseUrl'); }
      }
    };

    calendarMock = {};
    mockery.registerMock('./core', () => calendarMock);
    sendMailSpy = sinon.stub().returns(Promise.resolve());
    replyFromExternalUserMock = sinon.stub().returns(Promise.resolve());
    invitationMock = {
      email: {
        sendNotificationEmails: sendMailSpy,
        replyFromExternalUser: replyFromExternalUserMock
      },
      link: {
        generateActionLinks: function() {
          return q.when({});
        }
      }
    };

    forUserMock = {
      get: sinon.stub(),
      set: function() {
        return q.when({});
      }
    };

    esnConfigMock = function() {
      return {
        inModule: function(mod) {
          expect(mod).to.equal('linagora.esn.calendar');

          return {
            forUser: () => forUserMock
          };
        }
      };
    };
    mockery.registerMock('../../../lib/invitation', () => invitationMock);
    this.moduleHelpers.addDep('helpers', helpers);
    userModuleMock = {
      findByEmail: function(mail, callback) {
        return callback(null, null);
      },
      get: function(id, callback) {
        return callback(null, null);
      }
    };
    this.moduleHelpers.addDep('user', userModuleMock);
    this.moduleHelpers.addDep('esn-config', esnConfigMock);

    this.calendarModulePath = this.moduleHelpers.modulePath;
  });

  describe('The dispatchEvent function', function() {
    let controller, req, result;

    beforeEach(function() {
      result = {
        _id: '1',
        objectType: 'a1'
      };

      req = {
        user: 'a',
        collaboration: 'b',
        body: {
          type: 'created',
          event_id: 'c'
        }
      };

      calendarMock.dispatch = (data, callback) => callback(null, result);
      controller = require(`${this.moduleHelpers.backendPath}/webserver/api/calendar/controller`)(this.moduleHelpers.dependencies);
    });

    it('should respond 400 if not have user', function(done) {
      delete req.user;

      const res = {
        status(code) {
          try {
            expect(code).to.equal(400);

            return {
              json: response => {
                expect(response).to.deep.equal({
                  error: {
                    code: 400,
                    message: 'Bad Request',
                    details: 'You must be logged in to access this resource'
                  }
                });

                done();
              }
            };
          } catch (error) {
            done(error);
          }
        }
      };

      controller.dispatchEvent(req, res);
    });

    it('should respond 400 if not have collaboration', function(done) {
      delete req.collaboration;

      const res = {
        status(code) {
          try {
            expect(code).to.equal(400);

            return {
              json: response => {
                expect(response).to.deep.equal({
                  error: {
                    code: 400,
                    message: 'Bad Request',
                    details: 'Collaboration id is missing'
                  }
                });

                done();
              }
            };
          } catch (error) {
            done(error);
          }
        }
      };

      controller.dispatchEvent(req, res);
    });

    it('should respond 400 if not have event id', function(done) {
      delete req.body.event_id;

      const res = {
        status(code) {
          try {
            expect(code).to.equal(400);

            return {
              json: response => {
                expect(response).to.deep.equal({
                  error: {
                    code: 400,
                    message: 'Bad Request',
                    details: 'Event id is missing'
                  }
                });

                done();
              }
            };
          } catch (error) {
            done(error);
          }
        }
      };

      controller.dispatchEvent(req, res);
    });

    it('should respond 500 if failed to dispatch calendar', function(done) {
      calendarMock.dispatch = (data, callback) => callback(new Error('Something wrong'));
      const res = {
        status(code) {
          try {
            expect(code).to.equal(500);

            return {
              json: response => {
                expect(response).to.deep.equal({
                  error: {
                    code: 500,
                    message: 'Event creation error',
                    details: 'Something wrong'
                  }
                });

                done();
              }
            };
          } catch (error) {
            done(error);
          }
        }
      };

      controller.dispatchEvent(req, res);
    });

    it('should respond 403 if dispatch calendar result is null', function(done) {
      calendarMock.dispatch = (data, callback) => callback(null, null);
      const res = {
        status(code) {
          try {
            expect(code).to.equal(403);

            return {
              json: response => {
                expect(response).to.deep.equal({
                  error: {
                    code: 403,
                    message: 'Forbidden',
                    details: 'You may not create the calendar event'
                  }
                });

                done();
              }
            };
          } catch (error) {
            done(error);
          }
        }
      };

      controller.dispatchEvent(req, res);
    });

    it('should respond 201 if successfully creates a calendar event', function(done) {
      const res = {
        status(code) {
          try {
            expect(code).to.equal(201);

            return {
              json: response => {
                expect(response).to.deep.equal(result);

                done();
              }
            };
          } catch (error) {
            done(error);
          }
        }
      };

      controller.dispatchEvent(req, res);
    });

    it('should respond 200 if successfully creates a calendar event', function(done) {
      req.body.type = 'others';

      const res = {
        status(code) {
          try {
            expect(code).to.equal(200);

            return {
              json: response => {
                expect(response).to.deep.equal(result);

                done();
              }
            };
          } catch (error) {
            done(error);
          }
        }
      };

      controller.dispatchEvent(req, res);
    });
  });

  describe('the changeParticipation function', function() {
    var req, vcalendar, ics, etag, callbackAfterGetDone, requestMock, setGetRequest, url, locale;

    function setMock() {
      ics = fs.readFileSync(self.calendarModulePath + url).toString('utf8');
      vcalendar = ICAL.Component.fromString(ics);
      locale = 'en';
      req = {
        eventPayload: {
          event: ics,
          calendarURI: 'events',
          organizerEmail: 'johndow@open-paas.org',
          attendeeEmail: 'janedoe@open-paas.org',
          uid: vcalendar.getFirstSubcomponent('vevent').getFirstPropertyValue('uid'),
          action: 'ACCEPTED'
        },
        user: {
          _id: 'c3po'
        },
        getLocale: () => locale,
        davserver: 'http://davserver',
        headers: ['header1', 'header2']
      };

      etag = 2;
      callbackAfterGetDone = function() { };
      setGetRequest = function() {
        requestMock = function(options, callback) {
          callbackAfterGetDone();

          return callback(null, {
            headers: { etag: etag },
            body: ics,
            getLocale: sinon.spy()
          });
        };

        mockery.registerMock('request', function(options, callback) {
          requestMock(options, callback);
        });
      };

      setGetRequest();
    }

    beforeEach(function() {
      url = '/test/unit-backend/fixtures/meeting.ics';
      setMock();
    });

    it('should return error 400 if the attendee does not exist in the vevent', function(done) {
      var attendeeEmail = 'test@linagora.com';
      var req = {
        eventPayload: {
          calendarURI: 'uri',
          uid: 'uid',
          attendeeEmail
        },
        user: {
          _id: 'c3po'
        },
        davserver: 'davserver',
        getLocale: sinon.spy()
      };

      var res = {
        status: function(status) {
          expect(status).to.equal(400);

          return {
            json: function(result) {
              expect(result).to.shallowDeepEqual({
                error: {
                  code: 400,
                  message: 'Can not update participation',
                  details: `Can not find the attendee ${attendeeEmail} in the event`
                },
                locale: req.getLocale()
              });
              done();
            }
          };
        }
      };

      require(this.calendarModulePath + '/backend/webserver/api/calendar/controller')(this.moduleHelpers.dependencies).changeParticipation(req, res);
    });

    describe('when the vevent has attendees', function() {
      it('should send a request to the davserver to fetch the event, and should return status 500 if request fails', function(done) {
        requestMock = function(options, callback) {
          expect(options.method).to.equal('GET');
          expect(options.url).to.equal([
            req.davserver,
            'calendars',
            req.user._id,
            req.eventPayload.calendarURI,
            req.eventPayload.uid + '.ics'
          ].join('/'));

          return callback(new Error());
        };

        var res = {
          status: function(status) {
            expect(status).to.equal(500);

            return {
              json: function(result) {
                expect(result).to.shallowDeepEqual({
                  error: {
                    code: 500,
                    message: 'Can not update participation',
                    details: 'Can not update participation'
                  },
                  locale: req.getLocale()
                });
                done();
              }
            };
          }
        };

        require(this.calendarModulePath + '/backend/webserver/api/calendar/controller')(this.moduleHelpers.dependencies).changeParticipation(req, res);
      });

      describe('request if first get request work', function() {
        it('should send a put request to davserver with If-Match, and return error 500 if it fails without 412', function(done) {
          callbackAfterGetDone = function() {
            requestMock = function(options, callback) {
              expect(options.method).to.equal('PUT');
              expect(options.headers['If-Match']).to.equal(etag);
              expect(options.url).to.equal([
                req.davserver,
                'calendars',
                req.user._id,
                req.eventPayload.calendarURI,
                vcalendar.getFirstSubcomponent('vevent').getFirstPropertyValue('uid') + '.ics'
              ].join('/'));
              expect(options.body).to.exist;

              return callback(new Error());
            };

            mockery.registerMock('request', requestMock);
          };

          var controller = require(this.calendarModulePath + '/backend/webserver/api/calendar/controller')(this.moduleHelpers.dependencies);

          var res = {
            status: function(status) {
              expect(status).to.equal(500);

              return {
                json: function(result) {
                  expect(result).to.shallowDeepEqual({
                    error: {
                      code: 500,
                      message: 'Can not update participation',
                      details: 'Can not update participation'
                    },
                    locale: req.getLocale()
                  });
                  done();
                }
              };
            }
          };

          controller.changeParticipation(req, res);
        });

        it('should retry doing put if 412 up to 12 times', function(done) {
          var time = 0;

          callbackAfterGetDone = function() {
            requestMock = function(options, callback) {
              time++;
              expect(options.method).to.equal('PUT');
              expect(options.headers['If-Match']).to.equal(etag);
              expect(options.url).to.equal([
                req.davserver,
                'calendars',
                req.user._id,
                req.eventPayload.calendarURI,
                vcalendar.getFirstSubcomponent('vevent').getFirstPropertyValue('uid') + '.ics'
              ].join('/'));
              expect(options.body).to.exist;
              setGetRequest();

              return callback(null, { statusCode: time === 12 ? 500 : 412 });
            };

            mockery.registerMock('request', requestMock);
          };

          var controller = require(this.calendarModulePath + '/backend/webserver/api/calendar/controller')(this.moduleHelpers.dependencies);

          var res = {
            status: function(status) {
              expect(status).to.equal(500);

              return {
                json: function(result) {
                  expect(result).to.shallowDeepEqual({
                    error: {
                      code: 500,
                      message: 'Can not update participation',
                      details: 'Can not update participation'
                    },
                    locale: req.getLocale()
                  });
                  done();
                }
              };
            }
          };

          controller.changeParticipation(req, res);
        });

        it('should fail if put fail with 412 more than 12 times', function(done) {
          callbackAfterGetDone = function() {
            requestMock = function(options, callback) {
              expect(options.method).to.equal('PUT');
              expect(options.headers['If-Match']).to.equal(etag);
              expect(options.url).to.equal([
                req.davserver,
                'calendars',
                req.user._id,
                req.eventPayload.calendarURI,
                vcalendar.getFirstSubcomponent('vevent').getFirstPropertyValue('uid') + '.ics'
              ].join('/'));
              expect(options.body).to.exist;
              setGetRequest();

              return callback(null, { statusCode: 412 });
            };

            mockery.registerMock('request', requestMock);
          };

          var controller = require(this.calendarModulePath + '/backend/webserver/api/calendar/controller')(this.moduleHelpers.dependencies);

          var res = {
            status: function(status) {
              expect(status).to.equal(500);

              return {
                json: function(result) {
                  expect(result).to.shallowDeepEqual({
                    error: {
                      code: 500,
                      message: 'Can not update participation',
                      details: 'Exceeded max number of try for atomic update of event'
                    },
                    locale: req.getLocale()
                  });
                  done();
                }
              };
            }
          };

          controller.changeParticipation(req, res);
        });

        it('should not send PUT request if attendee participation status had been already set to target value', function(done) {
          req.eventPayload.attendeeEmail = 'babydoe@open-paas.org';
          callbackAfterGetDone = () => {
            requestMock = () => done(new Error('should not call request a second time'));
          };

          const controller = require(this.calendarModulePath + '/backend/webserver/api/calendar/controller')(this.moduleHelpers.dependencies);
          const res = {
            status: status => {
              expect(status).to.equal(200);

              return {
                json: function(result) {
                  expect(result).to.shallowDeepEqual({
                    attendeeEmail: req.eventPayload.attendeeEmail,
                    locale: req.getLocale()
                  });
                  done();
                }
              };
            }
          };

          controller.changeParticipation(req, res);
        });
      });

      describe('when the event participation change has successed', function() {
        describe('if user is found', function() {
          const userMock = { _id: 'userId' };

          beforeEach(function() {
            userModuleMock.findByEmail = (email, callback) => callback(null, userMock);
            callbackAfterGetDone = () => {
              requestMock = (options, callback) => callback(null, { statusCode: 200 });
              mockery.registerMock('request', requestMock);
            };
          });

          it('should not send notification message to organizer if event is not modified', function(done) {
            req.eventPayload.attendeeEmail = 'babydoe@open-paas.org';

            const controller = require(this.calendarModulePath + '/backend/webserver/api/calendar/controller')(this.moduleHelpers.dependencies);
            const res = {
              status: () => ({
                json: function(result) {
                  expect(result).to.shallowDeepEqual({
                    redirect: true,
                    locale: req.getLocale()
                  });
                  expect(sendMailSpy).to.have.not.been.called;
                  done();
                }
              })
            };

            controller.changeParticipation(req, res);
          });

          it('should send notification message to organizer if event is modified', function(done) {
            const controller = require(this.calendarModulePath + '/backend/webserver/api/calendar/controller')(this.moduleHelpers.dependencies);
            const res = {
              status: () => ({
                json: function(result) {
                  expect(sendMailSpy).to.have.been.calledWith({
                    sender: userMock,
                    recipientEmail: req.eventPayload.organizerEmail,
                    method: 'REPLY',
                    ics: sinon.match.string,
                    calendarURI: req.eventPayload.calendarURI,
                    domain: req.domain
                  });
                  expect(result).to.shallowDeepEqual({
                    redirect: true,
                    locale: req.getLocale()
                  });
                  done();
                }
              })
            };

            controller.changeParticipation(req, res);
          });
        });

        describe('if the user cannot be found', function() {
          it('should return error 500 if the user search returns an error', function(done) {
            userModuleMock.findByEmail = sinon.spy(function(email, callback) {
              expect(email).to.equal(req.eventPayload.attendeeEmail);
              callback(new Error());
            });

            callbackAfterGetDone = function() {
              requestMock = function(options, callback) {
                return callback(null, { statusCode: 200 });
              };
              mockery.registerMock('request', requestMock);
            };

            var controller = require(this.calendarModulePath + '/backend/webserver/api/calendar/controller')(this.moduleHelpers.dependencies);
            var res = {
              status: function(status) {
                expect(status).to.equal(500);

                return {
                  json: function(result) {
                    expect(result).to.shallowDeepEqual({
                      error: {
                        code: 500,
                        message: 'Can not update participation',
                        details: 'Error while post-processing participation change'
                      },
                      locale: req.getLocale()
                    });
                    done();
                  }
                };
              }
            };

            controller.changeParticipation(req, res);
          });

          it('should return error 500 if the esn baseUrl cannot be retrieved form the config', function(done) {
            helpers.config.getBaseUrl = sinon.spy(function(user, callback) {
              callback(new Error());
            });

            callbackAfterGetDone = function() {
              requestMock = function(options, callback) {
                return callback(null, { statusCode: 200 });
              };
              mockery.registerMock('request', requestMock);
            };

            var controller = require(this.calendarModulePath + '/backend/webserver/api/calendar/controller')(this.moduleHelpers.dependencies);
            var res = {
              status: function(status) {
                expect(status).to.equal(500);

                return {
                  json: function(result) {
                    expect(result).to.shallowDeepEqual({
                      error: {
                        code: 500,
                        message: 'Can not update participation',
                        details: 'Error while post-processing participation change'
                      },
                      locale: req.getLocale()
                    });
                    done();
                  }
                };
              }
            };

            controller.changeParticipation(req, res);
          });

          it('should send 200 and render the event consultation page', function(done) {
            var links = 'links';

            invitationMock.link.generateActionLinks = sinon.spy(function(url, eventData) {
              expect(url).to.equal('baseUrl');
              expect(eventData).to.deep.equal(req.eventPayload);

              return q.when(links);
            });

            callbackAfterGetDone = function() {
              requestMock = function(options, callback) {

                return callback(null, { statusCode: 200 });
              };
              mockery.registerMock('request', requestMock);
            };

            var controller = require(this.calendarModulePath + '/backend/webserver/api/calendar/controller')(this.moduleHelpers.dependencies);
            var res = {
              status: function(status) {
                expect(status).to.equal(200);

                return {
                  json: function(result) {
                    expect(result).to.shallowDeepEqual({
                      attendeeEmail: req.eventPayload.attendeeEmail,
                      links,
                      locale
                    });
                    done();
                  }
                };
              }
            };

            controller.changeParticipation(req, res);
          });

          it('should send notification message to organizer', function(done) {
            var links = 'links';

            invitationMock.link.generateActionLinks = sinon.spy(function(url, eventData) {
              expect(url).to.equal('baseUrl');
              expect(eventData).to.deep.equal(req.eventPayload);

              return Promise.resolve(links);
            });

            callbackAfterGetDone = function() {
              requestMock = function(options, callback) {

                return callback(null, { statusCode: 200 });
              };
              mockery.registerMock('request', requestMock);
            };

            var controller = require(this.calendarModulePath + '/backend/webserver/api/calendar/controller')(this.moduleHelpers.dependencies);
            var res = {
              status: function(status) {
                expect(status).to.equal(200);

                return {
                  json: function(result) {
                    expect(result).to.shallowDeepEqual({
                      attendeeEmail: req.eventPayload.attendeeEmail,
                      links,
                      locale
                    });

                    return process.nextTick(() => {
                      expect(replyFromExternalUserMock).to.have.been.calledWith({
                        editorEmail: req.eventPayload.attendeeEmail,
                        recipientEmail: req.eventPayload.organizerEmail,
                        ics: sinon.match.string,
                        calendarURI: req.eventPayload.calendarURI,
                        domain: req.domain
                      });
                      done();
                    });
                  }
                };
              }
            };

            controller.changeParticipation(req, res);
          });
        });
      });
    });

    // Skip because this feature does not work, related issue: https://ci.linagora.com/linagora/lgs/openpaas/linagora.esn.calendar/issues/1770
    describe.skip('when the vevent is recurring with exception', function() {
      beforeEach(function() {
        url = '/test/unit-backend/fixtures/meeting-recurring-with-exception.ics';
        setMock();
      });

      it('should work even if the attendee does not exist in the vevent but does in a subinstance of the event', function(done) {
        const req = {
          eventPayload: {
            calendarURI: 'uri',
            attendeeEmail: 'lduzan@linagora.com',
            uid: 'uid'
          },
          user: {
            _id: 'c3po'
          },
          davserver: 'davserver',
          getLocale: () => ''
        };

        const res = {
          status: status => {
            expect(status).to.equal(500);

            return {
              json: function(result) {
                expect(result).to.shallowDeepEqual({
                  error: {
                    code: 500,
                    message: 'Can not update participation'
                  },
                  locale: req.getLocale()
                });
                done();
              }
            };
          }
        };

        callbackAfterGetDone = function() {
          requestMock = function(options, callback) {
            return callback(null, { statusCode: 200 });
          };
          mockery.registerMock('request', requestMock);
        };

        var controller = require(this.calendarModulePath + '/backend/webserver/api/calendar/controller')(this.moduleHelpers.dependencies);

        controller.changeParticipation(req, res);
      });
    });
  });
  describe('the downloadIcsFile function', function() {
    let req, requestMock, controller;

    beforeEach(function() {
      req = {
        query: { jwt: '1234' },
        linkPayload: {
          calendarHomeId: '123',
          calendarId: '123',
          userId: '12345'
        },
        user: {
          _id: '12345'
        },
        davserver: 'http://davserver',
        headers: { 'Content-Disposition': 'attachment; filename=MyCalendar.ics' }
      };

      requestMock = function(options, callback) {

        return callback(null, {});
      };

      mockery.registerMock('request', function(options, callback) {
        requestMock(options, callback);
      });

      userMock = {
        _id: 1234,
        firstname: 'test'
      };

      userModuleMock.get = (userId, callback) => callback(null, userMock);
      controller = require(this.calendarModulePath + '/backend/webserver/api/calendar/controller')(this.moduleHelpers.dependencies);
    });

    it('should send 403 if the token is invalid', function(done) {
      const res = {
        status: function(status) {
          expect(status).to.equal(403);

          return {
            json: function(result) {
              expect(result).to.shallowDeepEqual({
                error: {
                  code: 403
                }
              });
              done();
            }
          };
        }
      };

      forUserMock.get.returns(Promise.resolve([{ calendarId: '123', token: '123' }]));
      controller.downloadIcsFile(req, res);
    });

    it('should send a request to the davserver to get get the calendar, and should return status 500 if request fails', function(done) {
      forUserMock.get.returns(Promise.resolve([{ calendarId: '123', token: '1234' }]));

      userModuleMock.get = sinon.spy(function(id, callback) {
        expect(id).to.equal(req.user._id);
        callback(new Error());
      });
      requestMock = function(options, callback) {
        expect(options.method).to.equal('GET');
        expect(options.url).to.equal([
          req.davserver,
          'calendars',
          req.linkPayload.calendarHomeId,
          req.linkPayload.calendarId + '?export'
        ].join('/'));

        return callback(new Error('Can not download the ics file'));
      };

      const res = {
        status: function(status) {
          expect(status).to.equal(500);

          return {
            json: function(result) {
              expect(result).to.shallowDeepEqual({
                error: {
                  code: 500,
                  message: 'Can not download the ics file'
                }
              });
              done();
            }
          };
        }
      };

      controller.downloadIcsFile(req, res);
    });

    it('should send the ICS content of the calendar ', function(done) {
      requestMock = function(options, callback) {
        expect(options.method).to.equal('GET');
        expect(options.url).to.equal([
          req.davserver,
          'calendars',
          req.linkPayload.calendarHomeId,
          req.linkPayload.calendarId + '?export'
        ].join('/'));

        return callback('data', { statusCode: 200 });
      };

      const res = {
        status(code) {
          expect(code).to.equal(200);

          return {
            json: function(result) {
              expect(result).to.be.not.null;
              done();
            }
          };
        }
      };

      forUserMock.get.returns(Promise.resolve([{ calendarId: '123', token: '1234' }]));

      controller.downloadIcsFile(req, res);
    });
  });

  describe('the generateJWTforSecretLink function', function() {
    it('should not generate a token when userId is not defined in payload', function(done) {
      const error = new Error('I failed to get the token');
      const req = {
        body: {
          calendarHomeId: 'calendarHomeId'
        }
      };
      const authMock = {
        jwt: {
          generateWebToken: function(p, callback) {
            expect(p).to.shallowDeepEqual(req.body);

            callback(error);
          }
        }
      };
      const res = {
        status: function(status) {
          expect(status).to.equal(500);

          return {
            json: function(result) {
              expect(result).to.shallowDeepEqual({
                error: {
                  code: 500,
                  message: 'Error when trying to generate a token for the secret link'
                }
              });
              done();
            }
          };
        }
      };

      this.moduleHelpers.addDep('auth', authMock);
      this.module = require(this.calendarModulePath + '/backend/webserver/api/calendar/controller')(this.moduleHelpers.dependencies);
      this.module.generateJWTforSecretLink(req, res)
        .then(() => done(new Error('Error when trying to generate a token for the secret link')))
        .catch(err => {
          expect(err.message).to.equal(error.message);
          done();
        });
    });

    it('should generate a token when userId is defined in paylaod', function(done) {
      const req = {
        body: {
          calendarHomeId: 'calendarHomeId',
          calendarId: 'calendarId',
          userId: 'userId'
        }
      };
      const authMock = {
        jwt: {
          generateWebToken: function(p, callback) {
            expect(p).to.shallowDeepEqual(req.body);

            callback(null, 'token');
          }
        }
      };
      const res = {
        status(code) {
          expect(code).to.equal(200);

          return {
            json: function(result) {
              expect(result.token).to.equal('token');
              done();
            }
          };
        }
      };

      forUserMock.set = sinon.spy(function(nameConfig, param) {
        expect(nameConfig).to.equal('secretLinkSettings');
        expect(param).to.deep.equal([{ calendarId: req.body.calendarId, token: 'token' }]);

        return q.when();
      });

      this.moduleHelpers.addDep('auth', authMock);
      this.module = require(this.calendarModulePath + '/backend/webserver/api/calendar/controller')(this.moduleHelpers.dependencies);
      this.module.generateJWTforSecretLink(req, res);
    });
  });
});

