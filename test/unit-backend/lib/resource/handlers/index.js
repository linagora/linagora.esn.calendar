const { expect } = require('chai');
const sinon = require('sinon');
const mockery = require('mockery');
const { EVENTS } = require('../../../../../backend/lib/constants');

describe('The Resource handlers module', function() {
  let amqpClient, amqpClientProvider, CONSTANTS;
  let jsonMessage;
  let pointToPointMock, ackMock, handleFunctions;

  beforeEach(function() {
    jsonMessage = { baz: 'qix' };
    handleFunctions = {};

    amqpClient = {
      subscribe: sinon.spy(),
      ack: sinon.spy()
    };

    amqpClientProvider = {
      getClient: sinon.stub().returns(Promise.resolve(amqpClient))
    };

    CONSTANTS = require(`${this.moduleHelpers.modulePath}/backend/lib/constants`);

    pointToPointMock = {
      get: sinon.spy(topic => {
        pointToPointMock.currentTopic = topic;

        return pointToPointMock;
      }),
      receive: handleFn => {
        handleFunctions[pointToPointMock.currentTopic] = handleFn;
      }
    };
    ackMock = sinon.spy();

    this.moduleHelpers.addDep('amqpClientProvider', amqpClientProvider);
    this.moduleHelpers.addDep('messaging', {
      pointToPoint: pointToPointMock
    });

    this.requireModule = function() {
      return require(`${this.moduleHelpers.modulePath}/backend/lib/resource/handlers`)(this.moduleHelpers.dependencies);
    };

    mockery.registerMock('./request', () => ({handle: () => {}}));
    mockery.registerMock('./accepted', () => ({handle: () => {}}));
    mockery.registerMock('./declined', () => ({handle: () => {}}));
  });

  describe('The init function', function() {
    it('should subscribe to CONSTANTS.EVENTS.RESOURCE_EVENT.CREATED', function() {
      this.requireModule().init();
      expect(pointToPointMock.get).to.have.been.calledWith(CONSTANTS.EVENTS.RESOURCE_EVENT.CREATED);
    });

    it('should subscribe to CONSTANTS.EVENTS.RESOURCE_EVENT.ACCEPTED', function() {
      this.requireModule().init();
      expect(pointToPointMock.get).to.have.been.calledWith(CONSTANTS.EVENTS.RESOURCE_EVENT.ACCEPTED);
    });

    it('should subscribe to CONSTANTS.EVENTS.RESOURCE_EVENT.DECLINED', function() {
      this.requireModule().init();
      expect(pointToPointMock.get).to.have.been.calledWith(CONSTANTS.EVENTS.RESOURCE_EVENT.DECLINED);
    });
  });

  describe('The handleEvent function', function() {
    it('should reject when request handler rejects', function(done) {
      const error = new Error('I failed');
      const handle = sinon.stub().returns(Promise.reject(error));

      mockery.registerMock('./request', () => ({
        handle
      }));

      this.requireModule().init();

      handleFunctions[EVENTS.RESOURCE_EVENT.CREATED](jsonMessage, { ack: ackMock })
        .then(() => done(new Error('should not resolve')))
        .catch(err => {
          expect(handle).to.have.been.calledWith(jsonMessage);
          expect(err).to.equals(error);
          done();
        });
    });

    it('should ack the message on success', function(done) {
      const response = 1;
      const handle = sinon.stub().returns(Promise.resolve(response));

      mockery.registerMock('./request', () => ({
        handle
      }));

      this.requireModule().init();

      handleFunctions[EVENTS.RESOURCE_EVENT.CREATED](jsonMessage, { ack: ackMock })
        .then(() => {
          expect(ackMock).to.have.been.calledOnce;
          done();
        });
    });
  });
});
