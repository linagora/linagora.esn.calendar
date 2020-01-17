'use strict';

const expect = require('chai').expect;
const mockery = require('mockery');
const sinon = require('sinon');
const ObjectId = require('bson').ObjectId;
const q = require('q');
const { RESOURCE } = require('../../../../backend/lib/constants');

describe('The calendar resource module', function() {
  let module, requestMock, logger, pubsub, auth, technicalUser, davserver, localpubsub,
      globalpubsub, email, requestError, requestStatus, requestBody, helpers, baseUrl;

  let simpleMailResultMock;

  beforeEach(function() {
    logger = {
      error: sinon.spy(),
      debug: sinon.spy(),
      info: sinon.spy(),
      warn: sinon.spy()
    };

    auth = {
      token: {
        getNewToken: (options, cb) => cb(null, { token: 'fakeToken' })
      }
    };

    technicalUser = {
        findByTypeAndDomain: (technicalUserType, domainId, cb) => cb(null, ['technical user 1']),
        getNewToken: (technicalUser, ttl, cb) => cb(null, { token: 'fakeToken' })
    };

    davserver = {
      utils: {
        getDavEndpoint: cb => cb('http://test/')
      }
    };

    localpubsub = {};
    globalpubsub = {};

    simpleMailResultMock = Promise.resolve();
    email = {
      system: {
        simpleMail: sinon.spy(() => simpleMailResultMock)
      }
    };

    baseUrl = 'http://127.0.0.1';

    helpers = {
      config: {
        getBaseUrl: function(arg, callback) {
          callback(null, baseUrl);
        }
      }
    };

    this.moduleHelpers.addDep('email', email);
    this.moduleHelpers.addDep('logger', logger);
    this.moduleHelpers.addDep('auth', auth);
    this.moduleHelpers.addDep('technical-user', technicalUser);
    this.moduleHelpers.addDep('davserver', davserver);
    this.moduleHelpers.addDep('pubsub', pubsub);
    this.moduleHelpers.addDep('pubsub', this.helpers.mock.pubsub('', localpubsub, globalpubsub));
    this.moduleHelpers.addDep('helpers', helpers);

    requestMock = sinon.spy((option, cb) => cb(requestError, { statusCode: requestStatus, body: requestBody }, requestBody));

    mockery.registerMock('request', requestMock);
  });

  describe('The listen function', function() {
    beforeEach(function() {
      module = require(this.moduleHelpers.backendPath + '/lib/resource/pubsub')(this.moduleHelpers.dependencies);
      module.listen();
    });

    it('should call pubsub susbcribe', function() {
      expect(localpubsub.topics).to.have.length.greaterThan(0);
    });

    describe('The create function', function() {
      it('should not call sabre if the resource\'s type is not calendar', function() {
        const fakeResource = {
          _id: new ObjectId(),
          creator: new ObjectId(),
          name: 'test'
        };

        localpubsub.topics['resource:created'].handler(fakeResource);
        expect(requestMock).to.not.have.been.called;
      });

      it('should send a email if the request return a error', function(done) {
        const fakeResource = {
          _id: new ObjectId(),
          creator: new ObjectId(),
          name: 'test',
          description: '',
          type: 'calendar'
        };

        requestError = new Error('Error');
        requestBody = new Error('Error');
        requestStatus = null;

        localpubsub.topics['resource:created'].handler(fakeResource).then(() => {
          expect(logger.error).to.have.been.calledWith(`Error while request calDav server, a mail will be sent at the resource's creator: ${fakeResource.creator} with the message: ${requestError}`);
          expect(email.system.simpleMail).to.have.been.calledWith(fakeResource.creator, { subject: RESOURCE.ERROR.MAIL.CREATED.SUBJECT, text: RESOURCE.ERROR.MAIL.CREATED.MESSAGE });
          done();
        }).catch(done);
      });

      it('should log the error if failed to send email to the creator', function(done) {
        const fakeResource = {
          _id: new ObjectId(),
          creator: new ObjectId(),
          name: 'test',
          description: '',
          type: 'calendar'
        };

        requestError = new Error('Error');
        requestBody = new Error('Error');
        requestStatus = null;

        const sendingEmailError = new Error('something wrong');

        simpleMailResultMock = Promise.reject(sendingEmailError);

        localpubsub.topics['resource:created'].handler(fakeResource).then(() => {
          expect(logger.error.firstCall).to.have.been.calledWith(`Error while request calDav server, a mail will be sent at the resource's creator: ${fakeResource.creator} with the message: ${requestError}`);
          expect(logger.error.secondCall).to.have.been.calledWith(`Error while sending email to resource's creator ${fakeResource.creator}`, sendingEmailError);
          expect(email.system.simpleMail).to.have.been.calledWith(fakeResource.creator, { subject: RESOURCE.ERROR.MAIL.CREATED.SUBJECT, text: RESOURCE.ERROR.MAIL.CREATED.MESSAGE });
          done();
        }).catch(err => done(err || new Error('Should resolve')));
      });

      it('should send a email if the request return a status != 201', function(done) {
        const fakeResource = {
          _id: new ObjectId(),
          creator: new ObjectId(),
          name: 'test',
          description: '',
          type: 'calendar'
        };

        requestError = null;
        requestBody = new Error('Error');
        requestStatus = 501;

        localpubsub.topics['resource:created'].handler(fakeResource).then(() => {
          expect(logger.error).to.have.been.calledWith(`Error while request calDav server, a mail will be sent at the resource's creator: ${fakeResource.creator} with the message: Error: Invalid response status from DAV server ${requestStatus}`);
          expect(email.system.simpleMail).to.have.been.calledWith(fakeResource.creator, { subject: RESOURCE.ERROR.MAIL.CREATED.SUBJECT, text: RESOURCE.ERROR.MAIL.CREATED.MESSAGE });
          done();
        }).catch(done);
      });

      it('should call sabre if the resource\'s type is calendar', function(done) {
        const fakeResource = {
          _id: new ObjectId(),
          creator: new ObjectId(),
          name: 'test',
          description: '',
          type: 'calendar'
        };

        requestError = null;
        requestBody = null;
        requestStatus = 201;

        localpubsub.topics['resource:created'].handler(fakeResource).then(() => {
          expect(requestMock).to.have.been.called;
          expect(logger.info).to.have.been.calledWith(`Calendar created for the resource: ${fakeResource._id} with the status: ${requestStatus}`);
          done();
        }).catch(done);
      });

      describe('payload with image', function() {
        let caldavClient, caldavClientLib;
        let fakeResource, fakePayload;

        beforeEach(function() {
          caldavClient = {
            createCalendarAsTechnicalUser: sinon.spy(function() {
              return q.when();
            })
          };
          caldavClientLib = function() {
            return caldavClient;
          };

          mockery.registerMock('../caldav-client', caldavClientLib);

          module = null;
          module = require(this.moduleHelpers.backendPath + '/lib/resource/pubsub')(this.moduleHelpers.dependencies);
          module.listen();
        });

        beforeEach(function() {
          fakeResource = {
            _id: new ObjectId(),
            creator: new ObjectId(),
            name: 'test',
            description: '',
            type: 'calendar'
          };

          fakePayload = {
            id: fakeResource._id,
            'dav:name': fakeResource.name,
            'apple:color': '#F44336',
            'caldav:description': fakeResource.description
          };
        });

        it('should call sabre with a resource containing an image', function(done) {
          fakeResource.icon = 'home';
          fakePayload.image = `IMAGE;VALUE=URI;DISPLAY=BADGE;FMTTYPE=image/png:${baseUrl}${RESOURCE.ICONS_PATH}home.png`;

          localpubsub.topics['resource:created'].handler(fakeResource).then(() => {
            expect(caldavClient.createCalendarAsTechnicalUser).to.have.been.calledWith(sinon.match.any, fakePayload);
            done();
          }).catch(done);
        });

        it('should call sabre with a resource containing a default image when no icon', function(done) {
          fakePayload.image = `IMAGE;VALUE=URI;DISPLAY=BADGE;FMTTYPE=image/png:${baseUrl}${RESOURCE.ICONS_PATH}desktop-mac.png`;

          localpubsub.topics['resource:created'].handler(fakeResource).then(() => {
            expect(caldavClient.createCalendarAsTechnicalUser).to.have.been.calledWith(sinon.match.any, fakePayload);
            done();
          }).catch(done);
        });

        afterEach(function() {
          mockery.deregisterMock('../caldav-client', caldavClientLib);
        });
      });
    });

    describe('The delete function', function() {
      it('should not call sabre if the resource\'s type is not calendar', function() {
        const fakeResource = {
          _id: new ObjectId(),
          creator: new ObjectId(),
          name: 'test'
        };

        localpubsub.topics['resource:deleted'].handler(fakeResource);
        expect(requestMock).to.not.have.been.called;
      });

      it('should send a email if the request return a error', function(done) {
        const fakeResource = {
          _id: new ObjectId(),
          creator: new ObjectId(),
          name: 'test',
          description: '',
          type: 'calendar'
        };

        requestError = new Error('Error');
        requestBody = new Error('Error');
        requestStatus = null;

        localpubsub.topics['resource:deleted'].handler(fakeResource).then(() => {
          expect(logger.error).to.have.been.calledWith(`Error while request calDav server, a mail will be sent at the resource's creator: ${fakeResource.creator} with the message: ${requestBody}`);
          expect(email.system.simpleMail).to.have.been.calledWith(fakeResource.creator, { subject: RESOURCE.ERROR.MAIL.REMOVED.SUBJECT, text: RESOURCE.ERROR.MAIL.REMOVED.MESSAGE });
          done();
        }).catch(done);
      });

      it('should log the error if failed to send email to the creator', function(done) {
        const fakeResource = {
          _id: new ObjectId(),
          creator: new ObjectId(),
          name: 'test',
          description: '',
          type: 'calendar'
        };

        requestError = new Error('Error');
        requestBody = new Error('Error');
        requestStatus = null;

        const sendingEmailError = new Error('something wrong');

        simpleMailResultMock = Promise.reject(sendingEmailError);

        localpubsub.topics['resource:deleted'].handler(fakeResource).then(() => {
          expect(logger.error.firstCall).to.have.been.calledWith(`Error while request calDav server, a mail will be sent at the resource's creator: ${fakeResource.creator} with the message: ${requestError}`);
          expect(logger.error.secondCall).to.have.been.calledWith(`Error while sending email to resource's creator ${fakeResource.creator}`, sendingEmailError);
          expect(email.system.simpleMail).to.have.been.calledWith(fakeResource.creator, { subject: RESOURCE.ERROR.MAIL.REMOVED.SUBJECT, text: RESOURCE.ERROR.MAIL.REMOVED.MESSAGE });
          done();
        }).catch(err => done(err || new Error('Should resolve')));
      });

      it('should send a email if the request return a status != 204', function(done) {
        const fakeResource = {
          _id: new ObjectId(),
          creator: new ObjectId(),
          name: 'test',
          description: '',
          type: 'calendar'
        };

        requestError = null;
        requestBody = new Error('Error');
        requestStatus = 501;

        localpubsub.topics['resource:deleted'].handler(fakeResource).then(() => {
          expect(logger.error).to.have.been.calledWith(`Error while request calDav server, a mail will be sent at the resource's creator: ${fakeResource.creator} with the message: Error: Invalid response status from DAV server ${requestStatus}`);
          expect(email.system.simpleMail).to.have.been.calledWith(fakeResource.creator, { subject: RESOURCE.ERROR.MAIL.REMOVED.SUBJECT, text: RESOURCE.ERROR.MAIL.REMOVED.MESSAGE });
          done();
        }).catch(done);
      });

      it('should call sabre if the resource\'s type is calendar', function(done) {
        const fakeResource = {
          _id: new ObjectId(),
          creator: new ObjectId(),
          name: 'test',
          description: '',
          type: 'calendar'
        };

        requestError = null;
        requestBody = null;
        requestStatus = 204;

        localpubsub.topics['resource:deleted'].handler(fakeResource).then(() => {
          expect(requestMock).to.have.been.called;
          expect(logger.info).to.have.been.calledWith(`Calendar removed for the resource: ${fakeResource._id} with the status: ${requestStatus}`);
          done();
        }).catch(done);
      });
    });

    describe('The update function', function() {
      it('should not call sabre if the resource\'s type is not calendar', function() {
        const fakeResource = {
          _id: new ObjectId(),
          creator: new ObjectId(),
          name: 'test'
        };

        localpubsub.topics['resource:updated'].handler(fakeResource);
        expect(requestMock).to.not.have.been.called;
      });

      it('should send a email if the request return a error', function(done) {
        const fakeResource = {
          _id: new ObjectId(),
          creator: new ObjectId(),
          name: 'test',
          description: '',
          type: 'calendar'
        };

        requestError = new Error('Error');
        requestBody = new Error('Error');
        requestStatus = null;

        localpubsub.topics['resource:updated'].handler(fakeResource).then(() => {
          expect(logger.error).to.have.been.calledWith(`Error while request calDav server, a mail will be sent at the resource's creator: ${fakeResource.creator} with the message: ${requestBody}`);
          expect(email.system.simpleMail).to.have.been.calledWith(fakeResource.creator, { subject: RESOURCE.ERROR.MAIL.UPDATED.SUBJECT, text: RESOURCE.ERROR.MAIL.UPDATED.MESSAGE });
          done();
        }).catch(done);
      });

      it('should log the error if failed to send email to the creator', function(done) {
        const fakeResource = {
          _id: new ObjectId(),
          creator: new ObjectId(),
          name: 'test',
          description: '',
          type: 'calendar'
        };

        requestError = new Error('Error');
        requestBody = new Error('Error');
        requestStatus = null;

        const sendingEmailError = new Error('something wrong');

        simpleMailResultMock = Promise.reject(sendingEmailError);

        localpubsub.topics['resource:updated'].handler(fakeResource).then(() => {
          expect(logger.error.firstCall).to.have.been.calledWith(`Error while request calDav server, a mail will be sent at the resource's creator: ${fakeResource.creator} with the message: ${requestError}`);
          expect(logger.error.secondCall).to.have.been.calledWith(`Error while sending email to resource's creator ${fakeResource.creator}`, sendingEmailError);
          expect(email.system.simpleMail).to.have.been.calledWith(fakeResource.creator, { subject: RESOURCE.ERROR.MAIL.UPDATED.SUBJECT, text: RESOURCE.ERROR.MAIL.UPDATED.MESSAGE });
          done();
        }).catch(err => done(err || new Error('Should resolve')));
      });

      it('should send a email if the request return a status != 204', function(done) {
        const fakeResource = {
          _id: new ObjectId(),
          creator: new ObjectId(),
          name: 'test',
          description: '',
          type: 'calendar'
        };

        requestError = null;
        requestBody = new Error('Error');
        requestStatus = 501;

        localpubsub.topics['resource:updated'].handler(fakeResource).then(() => {
          expect(logger.error).to.have.been.calledWith(`Error while request calDav server, a mail will be sent at the resource's creator: ${fakeResource.creator} with the message: Error: Invalid response status from DAV server ${requestStatus}`);
          expect(email.system.simpleMail).to.have.been.calledWith(fakeResource.creator, { subject: RESOURCE.ERROR.MAIL.UPDATED.SUBJECT, text: RESOURCE.ERROR.MAIL.UPDATED.MESSAGE });
          done();
        }).catch(done);
      });

      it('should not updated calendar if resource name or description have not change', function(done) {
        const fakeResource = {
          _id: new ObjectId(),
          creator: new ObjectId(),
          name: 'test',
          description: 'description',
          type: 'calendar'
        };

        requestError = null;
        requestBody = {
          _links: {
            self: {
              href: 'uri'
            }
          },
          'dav:name': 'test',
          'caldav:description': 'description',
          'apple:color': 'color'
        };
        requestStatus = 204;

        localpubsub.topics['resource:updated'].handler(fakeResource).then(() => {
          expect(requestMock).to.have.been.called;
          expect(logger.warn).to.have.been.calledWith(`Calendar is already up to date for the resource: ${fakeResource._id}`);
          done();
        }).catch(done);
      });

      it('should call sabre and updated calendar if resource name or description have change', function(done) {
        const fakeResource = {
          _id: new ObjectId(),
          creator: new ObjectId(),
          name: 'test',
          description: 'description',
          type: 'calendar'
        };

        requestError = null;
        requestBody = {
          _links: {
            self: {
              href: 'uri'
            }
          },
          'dav:name': 'old_test',
          'caldav:description': 'description',
          'apple:color': 'color'
        };
        requestStatus = 204;

        localpubsub.topics['resource:updated'].handler(fakeResource).then(() => {
          expect(requestMock).to.have.been.called;
          expect(logger.info).to.have.been.calledWith(`Calendar updated for the resource: ${fakeResource._id} with the status: ${requestStatus}`);
          done();
        }).catch(done);
      });

      describe('payload with image', function() {
        let caldavClient, caldavClientLib;
        let fakeResource, updatedFakeResource, fakePayload;

        beforeEach(function() {
          fakeResource = {
            _id: new ObjectId(),
            creator: new ObjectId(),
            name: 'test',
            description: '',
            type: 'calendar'
          };

          updatedFakeResource = {
            _id: fakeResource._id,
            creator: fakeResource.creator,
            name: 'updated',
            description: '',
            type: 'calendar'
          };

          fakePayload = {
            id: fakeResource._id,
            'dav:name': updatedFakeResource.name,
            'apple:color': '#F44336',
            'caldav:description': fakeResource.description
          };
        });

        beforeEach(function() {
          caldavClient = {
            updateCalendarAsTechnicalUser: sinon.spy(function() {
              return q.when();
            }),
            getCalendarAsTechnicalUser: sinon.spy(function() {
              return q.when(fakeResource);
            })
          };
          caldavClientLib = function() {
            return caldavClient;
          };

          mockery.registerMock('../caldav-client', caldavClientLib);

          module = null;
          module = require(this.moduleHelpers.backendPath + '/lib/resource/pubsub')(this.moduleHelpers.dependencies);
          module.listen();
        });

        it('should call sabre with a resource containing an image', function(done) {
          fakeResource.icon = 'home';
          updatedFakeResource.icon = 'home';
          fakePayload.image = `IMAGE;VALUE=URI;DISPLAY=BADGE;FMTTYPE=image/png:${baseUrl}${RESOURCE.ICONS_PATH}home.png`;

          localpubsub.topics['resource:updated'].handler(updatedFakeResource).then(() => {
            expect(caldavClient.getCalendarAsTechnicalUser).to.have.been.called;
            expect(caldavClient.updateCalendarAsTechnicalUser).to.have.been.calledWith(sinon.match.any, fakePayload);
            done();
          }).catch(done);
        });

        it('should call sabre with a resource containing a default image when no icon', function(done) {
          fakePayload.image = `IMAGE;VALUE=URI;DISPLAY=BADGE;FMTTYPE=image/png:${baseUrl}${RESOURCE.ICONS_PATH}desktop-mac.png`;

          localpubsub.topics['resource:updated'].handler(updatedFakeResource).then(() => {
            expect(caldavClient.getCalendarAsTechnicalUser).to.have.been.called;
            expect(caldavClient.updateCalendarAsTechnicalUser).to.have.been.calledWith(sinon.match.any, fakePayload);
            done();
          }).catch(done);
        });

        afterEach(function() {
          mockery.deregisterMock('../caldav-client', caldavClientLib);
        });
      });
    });
  });
});
