'use strict';

const expect = require('chai').expect;
const mockery = require('mockery');
const sinon = require('sinon');
const ObjectId = require('bson').ObjectId;
const q = require('q');
const {RESOURCE} = require('../../../../backend/lib/constants');

describe('The calendar resource module', function() {
  let module, requestMock, logger, pubsub, auth, davserver, localpubsub,
      globalpubsub, email, requestError, requestStatus;

  beforeEach(function() {
    logger = {
      error: sinon.spy(),
      debug: sinon.spy(),
      info: sinon.spy(),
      warning: sinon.spy()
    };

    auth = {
      token: {
        getNewToken: (options, cb) => cb(null, { token: 'fakeToken' })
      }
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
    this.moduleHelpers.addDep('auth', auth);
    this.moduleHelpers.addDep('davserver', davserver);
    this.moduleHelpers.addDep('pubsub', pubsub);
    this.moduleHelpers.addDep('pubsub', this.helpers.mock.pubsub('', localpubsub, globalpubsub));

    requestMock = sinon.spy((option, cb) => cb(requestError, { statusCode: requestStatus }));

    mockery.registerMock('request', requestMock);
  });

  describe('The listen function', function() {

    beforeEach(function() {
      module = require(this.moduleHelpers.backendPath + '/lib/resource/pubsub')(this.moduleHelpers.dependencies);
      module.listen();
    });

    it('should call pubsub susbcribe', function() {
      expect(globalpubsub.topics).to.have.length.greaterThan(0);
    });

    describe('The create function', function() {
      it('should not call sabre if the resource\'s type is not calendar', function() {
        const fakeResource = {
          _id: new ObjectId(),
          creator: new ObjectId(),
          name: 'test'
        };

        globalpubsub.topics['resource:created'].handler(fakeResource);
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
        requestStatus = null;

        globalpubsub.topics['resource:created'].handler(fakeResource).then(() => {
          expect(logger.error).to.have.been.calledWith(`Error while request calDav server, a mail will be sent at the resource\'s creator: ${requestError || requestStatus}`);
          expect(email.system.simpleMail).to.have.been.calledWith(fakeResource.creator, {subject: RESOURCE.ERROR.MAIL.SUBJECT, text: RESOURCE.ERROR.MAIL.MESSAGE});
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
        requestStatus = 501;

        globalpubsub.topics['resource:created'].handler(fakeResource).then(() => {
          expect(logger.error).to.have.been.calledWith(`Error while request calDav server, a mail will be sent at the resource\'s creator: ${requestError || requestStatus}`);
          expect(email.system.simpleMail).to.have.been.calledWith(fakeResource.creator, {subject: RESOURCE.ERROR.MAIL.SUBJECT, text: RESOURCE.ERROR.MAIL.MESSAGE});
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
        requestStatus = 201;

        globalpubsub.topics['resource:created'].handler(fakeResource).then(() => {
          expect(requestMock).to.have.been.called;
          expect(logger.info).to.have.been.calledWith(`Calendar created for the resource: ${fakeResource._id} with the status: ${requestStatus}`);
          done();
        }).catch(done);
      });
    });
  });
});
