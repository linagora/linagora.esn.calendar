'use strict';

var mockery = require('mockery');
var chai = require('chai');
var path = require('path');
var helpers = require('linagora-rse').test.helpers;
var testConfig = require('../config/servers-conf.js');
var backendPath = path.normalize(__dirname + '/../../backend');

before(function() {
  chai.use(require('chai-shallow-deep-equal'));
  chai.use(require('sinon-chai'));
  chai.use(require('chai-as-promised'));

const basePath = path.resolve(__dirname + '/../../node_modules/linagora-rse');
const tmpPath = path.resolve(__dirname + '/../..', testConfig.tmp);
  this.testEnv = {
    basePath: basePath,
    backendPath: backendPath,
    tmp: tmpPath,
    fixtures: path.resolve(__dirname + '/fixtures'),
    initCore: function(callback) {
      var core = require(basePath + '/backend/core');
      core.init();
      if (callback) {
        callback();
      }
      return core;
    }
  };
  this.helpers = {};
  helpers(this.helpers, this.testEnv);
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
