const expect = require('chai').expect;

describe('The alarm handlers module', function() {
  let action, handler;

  beforeEach(function() {
    action = 'myaction';
    handler = 'myhandler';

    this.calendarModulePath = this.moduleHelpers.modulePath;
    this.requireModule = function() {
      return require(this.calendarModulePath + '/backend/lib/alarm/handlers')();
    };
  });

  describe('The get function', function() {
    it('should return empty array when input action is undefined', function() {
      expect(this.requireModule().get()).to.be.an('Array').and.to.be.empty;
    });

    it('should return empty array when no handlers are registered', function() {
      expect(this.requireModule().get('foobarbaz')).to.be.an('Array').and.to.be.empty;
    });
  });

  describe('The register function', function() {
    it('should not register handler when action is undefined', function() {
      const module = this.requireModule();

      module.register(undefined, handler);

      expect(module.getHandlers()).to.be.empty;
    });

    it('should not register handler when handler is undefined', function() {
      const module = this.requireModule();

      module.register(action);

      expect(module.getHandlers()).to.be.empty;
    });

    it('should not override current handler', function() {
      const module = this.requireModule();

      module.register(action, handler);
      module.register(action, handler);

      expect(module.get(action)).to.deep.equal([handler, handler]);
    });
  });

  it('should return handlers registered for the given action', function() {
    const module = this.requireModule();

    module.register(action, handler);

    expect(module.get(action)).to.deep.equal([handler]);
  });
});
