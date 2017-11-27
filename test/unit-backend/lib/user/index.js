'use strict';

const expect = require('chai').expect;
const mockery = require('mockery');
const sinon = require('sinon');
const _ = require('lodash');

describe('The calendar user module', function() {
  let pubsubListen, deps, dependencies;

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

    dependencies = function(name) {
      return deps[name];
    };

    pubsubListen = sinon.spy();
    mockery.registerMock('./pubsub', _.constant({listen: pubsubListen}));
  });

  describe('The listen function', function() {

    it('should register listeners', function() {
      var module = require('../../../../backend/lib/user')(dependencies);

      module.listen();
      expect(pubsubListen).to.have.been.calledOnce;
    });
  });
});
