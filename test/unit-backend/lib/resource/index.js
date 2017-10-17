'use strict';

const expect = require('chai').expect;
const mockery = require('mockery');
const sinon = require('sinon');
const _ = require('lodash');

describe('The calendar resource module', function() {
  let pubsubListen, deps, dependencies, handlersInit;

  beforeEach(function() {
    deps = {
      elasticsearch: {},
      logger: {
        error: function() {},
        debug: function() {},
        info: function() {},
        warning: function() {}
      }
    };

    handlersInit = sinon.stub();

    dependencies = function(name) {
      return deps[name];
    };

    pubsubListen = sinon.spy();
    mockery.registerMock('./pubsub', _.constant({listen: pubsubListen}));
    mockery.registerMock('./handlers', () => ({ init: handlersInit }));
  });

  describe('The listen function', function() {

    it('should register listeners', function() {
      var module = require('../../../../backend/lib/resource')(dependencies);

      module.listen();
      expect(pubsubListen).to.have.been.calledOnce;
      expect(handlersInit).to.have.been.calledOnce;
    });
  });
});
