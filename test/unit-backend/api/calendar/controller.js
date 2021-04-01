'use strict';

var expect = require('chai').expect;
var mockery = require('mockery');
var fs = require('fs');
var ICAL = require('@linagora/ical.js');
var q = require('q');
var sinon = require('sinon');

describe('The calendar controller', function() {
  let userModuleMock, invitationMock, calendarMock, helpers, forUserMock, self, esnConfigMock, esnConfigInModuleMock;
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
      set: sinon.stub().returns(q.when({}))
    };

    esnConfigInModuleMock = {
      forUser: sinon.stub().returns(forUserMock)
    };

    esnConfigMock = sinon.spy(function() {
      return {
        inModule: function(mod) {
          expect(mod).to.equal('linagora.esn.calendar');

          return esnConfigInModuleMock;
        }
      };
    });
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
        query: { token: 'sfgeag5sda28sddh' },
        params: {
          calendarHomeId: 'calendarHomeId',
          calendarId: 'calendarId'
        },
        user: {
          _id: 'calendarHomeId'
        },
        davserver: 'http://davserver',
        headers: {
          'Content-Disposition': 'attachment; filename=calendar.ics',
          'Content-type': 'text/calendar'
        }
      };

      requestMock = function(options, callback) {
        return callback(null, {});
      };

      mockery.registerMock('request', function(options, callback) {
        requestMock(options, callback);
      });

      controller = require(this.calendarModulePath + '/backend/webserver/api/calendar/controller')(this.moduleHelpers.dependencies);
    });

    it('should send 403 if the token is invalid', function(done) {
      const res = {
        status: function(status) {
          expect(status).to.equal(403);

          return {
            json: function(result) {
              expect(result).to.deep.equal({
                error: {
                  code: 403,
                  message: 'Forbidden',
                  details: 'Forbidden'
                }
              });
              done();
            }
          };
        }
      };

      forUserMock.get.returns(Promise.resolve([{ calendarId: req.params.calendarId, token: req.query.token + '123' }]));

      controller.downloadIcsFile(req, res);

      expect(esnConfigMock).to.have.been.calledWith('secretLinkToken');
      expect(esnConfigInModuleMock.forUser).to.have.been.calledWith(req.user);
      expect(forUserMock.get).to.have.been.calledWith('secretLinkSettings');
    });

    it('should send 403 if the requested calendar\'s id is not found in the user\'s settings', function(done) {
      const res = {
        status: function(status) {
          expect(status).to.equal(403);

          return {
            json: function(result) {
              expect(result).to.deep.equal({
                error: {
                  code: 403,
                  message: 'Forbidden',
                  details: 'Forbidden'
                }
              });
              done();
            }
          };
        }
      };

      forUserMock.get.returns(Promise.resolve([{ calendarId: req.params.calendarId + '123', token: req.query.token }]));

      controller.downloadIcsFile(req, res);

      expect(esnConfigMock).to.have.been.calledWith('secretLinkToken');
      expect(esnConfigInModuleMock.forUser).to.have.been.calledWith(req.user);
      expect(forUserMock.get).to.have.been.calledWith('secretLinkSettings');
    });

    it('should send a request to the DAV server to get the ics of the calendar, and send 500 if the request fails due to an unexpected error', function(done) {
      forUserMock.get.returns(Promise.resolve([{ calendarId: req.params.calendarId, token: req.query.token }]));

      requestMock = function(options, callback) {
        expect(options.method).to.equal('GET');
        expect(options.url).to.equal([
          req.davserver,
          'calendars',
          req.params.calendarHomeId,
          req.params.calendarId + '?export'
        ].join('/'));

        return callback(new Error('The request failed due to an unexpected error'));
      };

      const res = {
        status: function(status) {
          expect(status).to.equal(500);

          return {
            json: function(result) {
              expect(result).to.deep.equal({
                error: {
                  code: 500,
                  message: 'Can not download the ics file',
                  details: 'Can not download the ics file'
                }
              });
              done();
            }
          };
        }
      };

      controller.downloadIcsFile(req, res);

      expect(esnConfigMock).to.have.been.calledWith('secretLinkToken');
      expect(esnConfigInModuleMock.forUser).to.have.been.calledWith(req.user);
      expect(forUserMock.get).to.have.been.calledWith('secretLinkSettings');
    });

    it('should send a request to the DAV server to get the ics of the calendar, and send the error status code if the request fails', function(done) {
      forUserMock.get.returns(Promise.resolve([{ calendarId: req.params.calendarId, token: req.query.token }]));

      requestMock = function(options, callback) {
        expect(options.method).to.equal('GET');
        expect(options.url).to.equal([
          req.davserver,
          'calendars',
          req.params.calendarHomeId,
          req.params.calendarId + '?export'
        ].join('/'));

        return callback(null, { statusCode: 404 });
      };

      const res = {
        status: function(status) {
          expect(status).to.equal(404);

          return {
            json: function(result) {
              expect(result).to.deep.equal({
                error: {
                  code: 404,
                  message: 'Can not download the ics file',
                  details: 'Can not download the ics file'
                }
              });
              done();
            }
          };
        }
      };

      controller.downloadIcsFile(req, res);

      expect(esnConfigMock).to.have.been.calledWith('secretLinkToken');
      expect(esnConfigInModuleMock.forUser).to.have.been.calledWith(req.user);
      expect(forUserMock.get).to.have.been.calledWith('secretLinkSettings');
    });

    it('should send 500 if it fails to get the config of the user', function(done) {
      forUserMock.get.returns(Promise.reject(new Error('Could not get the config of the user')));

      const res = {
        status: function(status) {
          expect(status).to.equal(500);

          return {
            json: function(result) {
              expect(result).to.shallowDeepEqual({
                error: {
                  code: 500,
                  message: 'Can not download the ics file due to an unexpected error',
                  details: 'Could not get the config of the user'
                }
              });
              done();
            }
          };
        }
      };

      controller.downloadIcsFile(req, res);

      expect(esnConfigMock).to.have.been.calledWith('secretLinkToken');
      expect(esnConfigInModuleMock.forUser).to.have.been.calledWith(req.user);
      expect(forUserMock.get).to.have.been.calledWith('secretLinkSettings');
    });

    it('should send the ics content of the calendar', function(done) {
      const icsData = 'ICS DATA';

      requestMock = function(options, callback) {
        expect(options.method).to.equal('GET');
        expect(options.url).to.equal([
          req.davserver,
          'calendars',
          req.params.calendarHomeId,
          req.params.calendarId + '?export'
        ].join('/'));

        return callback(null, { statusCode: 200, body: icsData });
      };

      const res = {
        status(code) {
          expect(code).to.equal(200);

          return {
            send: function(result) {
              expect(result).to.equal(icsData);
              expect(res.setHeader.firstCall).to.have.been.calledWith('Content-Disposition', 'attachment;filename=calendar.ics');
              expect(res.setHeader.secondCall).to.have.been.calledWith('Content-type', 'text/calendar');
              done();
            }
          };
        },
        setHeader: sinon.stub()
      };

      forUserMock.get.returns(Promise.resolve([{ calendarId: req.params.calendarId, token: req.query.token }]));

      controller.downloadIcsFile(req, res);

      expect(esnConfigMock).to.have.been.calledWith('secretLinkToken');
      expect(esnConfigInModuleMock.forUser).to.have.been.calledWith(req.user);
      expect(forUserMock.get).to.have.been.calledWith('secretLinkSettings');
    });
  });

  describe('the getSecretLink function', function() {
    let token, controller;

    beforeEach(function() {
      token = 'dsdf823fh98dya';

      mockery.registerMock('short-uuid', { generate: () => token });

      controller = require(`${this.moduleHelpers.backendPath}/webserver/api/calendar/controller`)(this.moduleHelpers.dependencies);
    });

    describe('when shouldResetLink === false', function() {
      it('should return 500 when it fails to get the user\'s settings', function(done) {
        const error = new Error('Something went wrong');
        const req = {
          query: {},
          params: {
            calendarHomeId: 'calendarHomeId',
            calendarId: 'calendarId'
          }
        };

        forUserMock.get = sinon.stub().returns(Promise.reject(error));

        const res = {
          status: function(status) {
            expect(status).to.equal(500);

            return {
              json: function(result) {
                expect(result).to.deep.equal({
                  error: {
                    code: 500,
                    message: 'Can not get the secret link',
                    details: error.message
                  }
                });
                done();
              }
            };
          }
        };

        controller.getSecretLink(req, res);

        expect(esnConfigMock).to.have.been.calledWith('secretLinkToken');
        expect(esnConfigInModuleMock.forUser).to.have.been.calledWith(req.user);
        expect(forUserMock.get).to.have.been.calledWith('secretLinkSettings');
      });

      it('should return 500 when it fails to set the user\'s settings when getting a new secret link', function(done) {
        const error = new Error('Something went wrong');
        const req = {
          query: {},
          params: {
            calendarHomeId: 'calendarHomeId',
            calendarId: 'calendarId'
          }
        };

        forUserMock.get = sinon.stub().returns(Promise.resolve([]));
        forUserMock.set = sinon.stub().returns(Promise.reject(error));

        const res = {
          status: function(status) {
            expect(status).to.equal(500);

            return {
              json: function(result) {
                expect(result).to.deep.equal({
                  error: {
                    code: 500,
                    message: 'Can not get the secret link',
                    details: error.message
                  }
                });
                expect(forUserMock.set).to.have.been.calledWith('secretLinkSettings', [{
                  calendarId: req.params.calendarId,
                  token
                }]);
                done();
              }
            };
          }
        };

        controller.getSecretLink(req, res);

        expect(esnConfigMock).to.have.been.calledWith('secretLinkToken');
        expect(esnConfigInModuleMock.forUser).to.have.been.calledWith(req.user);
        expect(forUserMock.get).to.have.been.calledWith('secretLinkSettings');
      });

      it('should return 200 with the secret link when it succeeds in getting the existing secret link', function(done) {
        const req = {
          query: {},
          params: {
            calendarHomeId: 'calendarHomeId',
            calendarId: 'calendarId'
          }
        };

        forUserMock.get = sinon.stub().returns(Promise.resolve([{
          calendarId: req.params.calendarId,
          token
        }]));

        const res = {
          status: function(status) {
            expect(status).to.equal(200);

            return {
              json: function(result) {
                expect(result).to.deep.equal({ secretLink: `baseUrl/calendar/api/calendars/${req.params.calendarHomeId}/${req.params.calendarId}/calendar.ics?token=${token}` });
                expect(forUserMock.set).to.have.not.been.called;
                done();
              }
            };
          }
        };

        controller.getSecretLink(req, res);

        expect(esnConfigMock).to.have.been.calledWith('secretLinkToken');
        expect(esnConfigInModuleMock.forUser).to.have.been.calledWith(req.user);
        expect(forUserMock.get).to.have.been.calledWith('secretLinkSettings');
      });

      it('should return 200 with a newly generated secret link when it does not find an existing secret link', function(done) {
        const req = {
          query: {},
          params: {
            calendarHomeId: 'calendarHomeId',
            calendarId: 'calendarId'
          }
        };

        forUserMock.get = sinon.stub().returns(Promise.resolve([{
          calendarId: req.params.calendarId
        }]));

        const res = {
          status: function(status) {
            expect(status).to.equal(200);

            return {
              json: function(result) {
                expect(result).to.deep.equal({ secretLink: `baseUrl/calendar/api/calendars/${req.params.calendarHomeId}/${req.params.calendarId}/calendar.ics?token=${token}` });
                expect(forUserMock.set).to.have.been.calledWith('secretLinkSettings', [{
                  calendarId: req.params.calendarId,
                  token
                }]);
                done();
              }
            };
          }
        };

        controller.getSecretLink(req, res);

        expect(esnConfigMock).to.have.been.calledWith('secretLinkToken');
        expect(esnConfigInModuleMock.forUser).to.have.been.calledWith(req.user);
        expect(forUserMock.get).to.have.been.calledWith('secretLinkSettings');
      });
    });

    describe('when shouldResetLink === true', function() {
      it('should return 500 when it fails to set the user\'s settings when getting a new secret link', function(done) {
        const error = new Error('Something went wrong');
        const req = {
          query: { shouldResetLink: 'true' },
          params: {
            calendarHomeId: 'calendarHomeId',
            calendarId: 'calendarId'
          }
        };

        forUserMock.set = sinon.stub().returns(Promise.reject(error));

        const res = {
          status: function(status) {
            expect(status).to.equal(500);

            return {
              json: function(result) {
                expect(result).to.deep.equal({
                  error: {
                    code: 500,
                    message: 'Can not get the secret link',
                    details: error.message
                  }
                });
                expect(forUserMock.set).to.have.been.calledWith('secretLinkSettings', [{
                  calendarId: req.params.calendarId,
                  token
                }]);
                done();
              }
            };
          }
        };

        controller.getSecretLink(req, res);

        expect(esnConfigMock).to.have.been.calledWith('secretLinkToken');
        expect(esnConfigInModuleMock.forUser).to.have.been.calledWith(req.user);
        expect(forUserMock.get).to.have.not.been.called;
      });

      it('should return 200 with a newly generated secret link', function(done) {
        const req = {
          query: { shouldResetLink: 'true' },
          params: {
            calendarHomeId: 'calendarHomeId',
            calendarId: 'calendarId'
          }
        };

        const res = {
          status: function(status) {
            expect(status).to.equal(200);

            return {
              json: function(result) {
                expect(result).to.deep.equal({ secretLink: `baseUrl/calendar/api/calendars/${req.params.calendarHomeId}/${req.params.calendarId}/calendar.ics?token=${token}` });
                expect(forUserMock.set).to.have.been.calledWith('secretLinkSettings', [{
                  calendarId: req.params.calendarId,
                  token
                }]);
                done();
              }
            };
          }
        };

        controller.getSecretLink(req, res);

        expect(esnConfigMock).to.have.been.calledWith('secretLinkToken');
        expect(esnConfigInModuleMock.forUser).to.have.been.calledWith(req.user);
        expect(forUserMock.get).to.have.not.been.called;
      });
    });
  });
});

