const { expect } = require('chai');
const sinon = require('sinon');
const mockery = require('mockery');

describe('The Resource handlers module', function() {
  let amqpClient, amqpClientProvider, CONSTANTS;
  let jsonMessage, originalMessage;

  beforeEach(function() {
    originalMessage = {foo: 'bar'};
    jsonMessage = { baz: 'qix' };

    amqpClient = {
      subscribe: sinon.spy(),
      ack: sinon.spy()
    };

    amqpClientProvider = {
      getClient: sinon.stub().returns(Promise.resolve(amqpClient))
    };

    CONSTANTS = require(`${this.moduleHelpers.modulePath}/backend/lib/constants`);

    this.moduleHelpers.addDep('amqpClientProvider', amqpClientProvider);
    this.requireModule = function() {
      return require(`${this.moduleHelpers.modulePath}/backend/lib/resource/handlers`)(this.moduleHelpers.dependencies);
    };
  });

  describe('The init function', function() {
    beforeEach(function() {
      mockery.registerMock('./request', () => {});
    });

    it('should subscribe to CONSTANTS.EVENTS.RESOURCE_EVENT.CREATED', function(done) {
      this.requireModule().init()
        .then(() => {
          expect(amqpClient.subscribe).to.have.been.calledWith(CONSTANTS.EVENTS.RESOURCE_EVENT.CREATED, sinon.match.func);
          done();
        })
        .catch(done);
    });

    it('should reject when AMQP client can not be resolved', function(done) {
      const error = new Error('I failed');

      amqpClientProvider.getClient.returns(Promise.reject(error));

      this.requireModule().init()
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err).to.equal(error);
          expect(amqpClient.subscribe).to.not.have.been.called;
          done();
        });
    });
  });

  describe('The resourceEventCreated function', function() {
    it('should reject when request handler rejects', function(done) {
      const error = new Error('I failed');
      const handle = sinon.stub().returns(Promise.reject(error));

      mockery.registerMock('./request', () => ({
        handle
      }));

      this.requireModule().init().then(test).catch(done);

      function test() {
        amqpClient.subscribe.firstCall.args[1](jsonMessage, originalMessage)
          .then(() => done(new Error('Should not occur')))
          .catch(err => {
            expect(handle).to.have.been.calledWith(jsonMessage);
            expect(amqpClient.ack).to.not.have.been.called;
            expect(err).to.equals(error);
            done();
          });
      }
    });

    it('should ack the message on success', function(done) {
      const response = 1;
      const handle = sinon.stub().returns(Promise.resolve(response));

      mockery.registerMock('./request', () => ({
        handle
      }));

      this.requireModule().init().then(test).catch(done);

      function test() {
        amqpClient.subscribe.firstCall.args[1](jsonMessage, originalMessage)
          .then(result => {
            expect(result).to.equal(response);
            expect(amqpClient.ack).to.have.been.calledWith(originalMessage);
            done();
          }).catch(done);
      }
    });
  });
});
