const { expect } = require('chai');
const sinon = require('sinon');
const mokery = require('mockery');

describe('The search/reindex module', function() {
  let deps, dependencies, getModule;

  beforeEach(function() {
    deps = {};

    dependencies = name => deps[name];

    mokery.registerMock('../caldav-client', () => ({}));

    getModule = () => require('../../../../backend/lib/search/reindex')(dependencies);
  });

  describe('The register function', function() {
    it('should register reindexing for calendar events', function() {
      const registerMock = sinon.spy();

      deps.elasticsearch = {
        reindexRegistry: {
          register: registerMock
        }
      };

      getModule().register();

      expect(registerMock).to.have.been.calledWith(
        'events',
        {
          name: 'events.idx',
          buildReindexOptionsFunction: sinon.match.func
        }
      );
    });
  });
});
