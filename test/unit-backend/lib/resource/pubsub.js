'use strict';

const expect = require('chai').expect;
const mockery = require('mockery');
const sinon = require('sinon');
const ObjectId = require('bson').ObjectId;
const q = require('q');
const {RESOURCE} = require('../../../../backend/lib/constants');

describe('The calendar resource module', function() {
  let module, requestMock, logger, pubsub, technicalUser, davserver, localpubsub,
      globalpubsub, email, requestError, requestStatus, requestBody;

  beforeEach(function() {
    logger = {
      error: sinon.spy(),
      debug: sinon.spy(),
      info: sinon.spy(),
      warning: sinon.spy()
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

    email = {
      system: {
        simpleMail: sinon.spy(() => q.when())
      }
    };

    this.moduleHelpers.addDep('email', email);
    this.moduleHelpers.addDep('logger', logger);
    this.moduleHelpers.addDep('technical-user', technicalUser);
    this.moduleHelpers.addDep('davserver', davserver);
    this.moduleHelpers.addDep('pubsub', pubsub);
    this.moduleHelpers.addDep('pubsub', this.helpers.mock.pubsub('', localpubsub, globalpubsub));

    requestMock = sinon.spy((option, cb) => cb(requestError, { statusCode: requestStatus }, requestBody));

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
          expect(logger.error).to.have.been.calledWith(`Error while request calDav server, a mail will be sent at the resource\'s creator: ${requestError || requestStatus} with the message: ${requestBody}`);
          expect(email.system.simpleMail).to.have.been.calledWith(fakeResource.creator, { subject: RESOURCE.ERROR.MAIL.CREATED.SUBJECT, text: RESOURCE.ERROR.MAIL.CREATED.MESSAGE });
          done();
        }).catch(done);
      });

      it('should send a email if the request return a status != 201 ', function(done) {
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
          expect(logger.error).to.have.been.calledWith(`Error while request calDav server, a mail will be sent at the resource\'s creator: ${requestError || requestStatus} with the message: ${requestBody}`);
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
          expect(logger.error).to.have.been.calledWith(`Error while request calDav server, a mail will be sent at the resource\'s creator: ${requestError || requestStatus} with the message: ${requestBody}`);
          expect(email.system.simpleMail).to.have.been.calledWith(fakeResource.creator, { subject: RESOURCE.ERROR.MAIL.REMOVED.SUBJECT, text: RESOURCE.ERROR.MAIL.REMOVED.MESSAGE });
          done();
        }).catch(done);
      });

      it('should send a email if the request return a status != 201 ', function(done) {
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
          expect(logger.error).to.have.been.calledWith(`Error while request calDav server, a mail will be sent at the resource\'s creator: ${requestError || requestStatus} with the message: ${requestBody}`);
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
  });
});
