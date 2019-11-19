const { expect } = require('chai');
const mockery = require('mockery');
const sinon = require('sinon');
const _ = require('lodash');

describe('The calendar search Module', function() {
  let pubsubListen, deps, dependencies;
  let getModule;

  beforeEach(function() {
    deps = {
      elasticsearch: {},
      logger: {
        error: () => {},
        debug: () => {},
        info: () => {},
        warning: () => {}
      }
    };

    dependencies = name => deps[name];
    pubsubListen = sinon.spy();
    mockery.registerMock('./pubsub', _.constant({ listen: pubsubListen }));
    mockery.registerMock('./reindex', () => ({ register: () => {} }));

    getModule = () => require('../../../../backend/lib/search')(dependencies);
  });

  describe('The listen function', function() {
    it('should register listeners', function() {
      const register = sinon.spy();

      mockery.registerMock('./searchHandler', _.constant({ register: register }));

      getModule().listen();
      expect(register).to.have.been.calledOnce;
      expect(pubsubListen).to.have.been.calledOnce;
    });

    it('should register reindexing for calendar events', function() {
      const registerMock = sinon.spy();

      mockery.registerMock('./searchHandler', () => ({ register: () => {} }));
      mockery.registerMock('./reindex', () => ({ register: registerMock }));

      getModule().listen();
      expect(registerMock).to.have.been.calledOnce;
    });
  });

});
