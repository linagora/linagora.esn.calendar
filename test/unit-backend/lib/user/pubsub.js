'use strict';

const expect = require('chai').expect;
const mockery = require('mockery');
const sinon = require('sinon');
const ObjectId = require('bson').ObjectId;
const { USER } = require('../../../../backend/lib/constants');

describe('The calendar user module', function() {
  let module, requestMock, loggerInfoSpy, loggerErrorSpy, pubsub, auth, technicalUser, davserver,
      localpubsub, globalpubsub, requestError, requestStatus, requestBody, fakeUser, topic, userModule;

  beforeEach(function() {
    topic = USER.CREATED;

    auth = {
      token: {
        getNewToken: (options, cb) => cb(null, { token: 'fakeToken' })
      }
    };

    fakeUser = {
      _id: new ObjectId()
    };

    technicalUser = {
        findByTypeAndDomain: (technicalUserType, domainId, cb) => cb(null, ['technical user 1']),
        getNewToken: (technicalUser, ttl, cb) => cb(null, { token: 'fakeToken' })
    };

    userModule = {
      get: sinon.spy(function(uuid, callback) {
        callback(null, { _id: uuid, name: 'name', domains: [{ _id: 1 }] });
      })
    };

    davserver = {
      utils: {
        getDavEndpoint: cb => cb('http://test/')
      }
    };

    localpubsub = {};
    globalpubsub = {};

    this.moduleHelpers.addDep('auth', auth);
    this.moduleHelpers.addDep('technical-user', technicalUser);
    this.moduleHelpers.addDep('davserver', davserver);
    this.moduleHelpers.addDep('pubsub', pubsub);
    this.moduleHelpers.addDep('pubsub', this.helpers.mock.pubsub('', localpubsub, globalpubsub));
    this.moduleHelpers.addDep('user', userModule);

    requestMock = sinon.spy((option, cb) => cb(requestError, { statusCode: requestStatus, body: requestBody }, requestBody));
    loggerErrorSpy = sinon.spy(this.moduleHelpers.dependencies('logger'), 'error');
    loggerInfoSpy = sinon.spy(this.moduleHelpers.dependencies('logger'), 'info');

    mockery.registerMock('request', requestMock);
  });

  describe('The listen function', function() {
    beforeEach(function() {
      module = require(this.moduleHelpers.backendPath + '/lib/user/pubsub')(this.moduleHelpers.dependencies);
      module.listen();
    });

    it('should call pubsub susbcribe', function() {
      expect(localpubsub.topics).to.have.length.greaterThan(0);
    });

    describe('The create function', function() {
      it('should log error if user.get fails', function(done) {
        const moduleError = new Error('Error');

        userModule.get = sinon.spy(function(uuid, callback) {
            callback(moduleError);
          });

        localpubsub.topics[topic].handler(fakeUser).then(() => {
          expect(loggerErrorSpy).to.have.been.calledWith(`Error while request calDav server for new user ${fakeUser._id} default calendar creation with the message: ${moduleError}`);
          expect(requestMock).to.not.have.been.called;
          done();
        }).catch(done);
      });

      it('should log error if the request return a error', function(done) {
        requestError = new Error('Error');
        requestBody = new Error('Error');
        requestStatus = null;

        localpubsub.topics[topic].handler(fakeUser).then(() => {
          expect(loggerErrorSpy).to.have.been.calledWith(`Error while request calDav server for new user ${fakeUser._id} default calendar creation with the message: ${requestBody}`);
          done();
        }).catch(done);
      });

      it('should log error if the request return a status != 201', function(done) {
        requestError = null;
        requestBody = new Error('Error');
        requestStatus = 501;

        localpubsub.topics[topic].handler(fakeUser).then(() => {
          expect(loggerErrorSpy).to.have.been.calledWith(`Error while request calDav server for new user ${fakeUser._id} default calendar creation with the message: ${requestBody}`);
          done();
        }).catch(done);
      });

      it('should call sabre user is fetched', function(done) {
        requestError = null;
        requestBody = null;
        requestStatus = 201;

        localpubsub.topics[topic].handler(fakeUser).then(() => {
          expect(requestMock).to.have.been.called;
          expect(loggerInfoSpy).to.have.been.calledWith(`Calendar created for the user: ${fakeUser._id} with the status: ${requestStatus}`);
          done();
        }).catch(done);
      });
    });
  });
});
