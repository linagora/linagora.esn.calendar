'use strict';

var mockery = require('mockery');
var chai = require('chai');
var path = require('path');
var backendPath = path.normalize(__dirname + '/../../backend');
let rse;

before(function() {
  chai.use(require('chai-shallow-deep-equal'));
  chai.use(require('sinon-chai'));
  chai.use(require('chai-as-promised'));
  chai.use(require('chai-datetime'));

  const basePath = path.resolve(__dirname + '/../../node_modules/linagora-rse');

  this.testEnv = {
    basePath: basePath,
    backendPath: backendPath,
    fixtures: path.resolve(__dirname + '/fixtures'),
    initCore(callback = () => {}) {
      rse.core.init(() => process.nextTick(callback));
    }
  };

  rse = require('linagora-rse');

  this.helpers = {};

  rse.test.helpers(this.helpers, this.testEnv);
  rse.test.moduleHelpers(this.helpers, this.testEnv);
  rse.test.apiHelpers(this.helpers, this.testEnv);
});

beforeEach(function() {
  mockery.enable({warnOnReplace: false, warnOnUnregistered: false, useCleanCache: true});
  var depsStore = {
    logger: require('./fixtures/logger-noop'),
    errors: require('./fixtures/errors')
  };
  var dependencies = function(name) {
    return depsStore[name];
  };
  var addDep = function(name, dep) {
    depsStore[name] = dep;
  };

  this.moduleHelpers = {
    modulePath: path.resolve(__dirname + '/../../'),
    backendPath: backendPath,
    addDep: addDep,
    dependencies: dependencies
  };
});

afterEach(function() {
  mockery.resetCache();
  mockery.deregisterAll();
  mockery.disable();
});
