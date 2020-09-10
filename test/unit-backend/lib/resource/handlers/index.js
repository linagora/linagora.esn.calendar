const { expect } = require('chai');
const sinon = require('sinon');
const mockery = require('mockery');

describe('The Resource handlers module', function() {
  let CONSTANTS;
  let pointToPointMock, handleFunctions;

  beforeEach(function() {
    handleFunctions = {};
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
});
