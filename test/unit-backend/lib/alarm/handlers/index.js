const expect = require('chai').expect;

describe('The alarm handlers module', function() {
  let action, handler, handle, uniqueId;

  beforeEach(function() {
    uniqueId = 'foo.bar.baz';
    action = 'myaction';
    handle = function() {};
    handler = {action, handle, uniqueId};

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
    it('should not register handler when undefined', function() {
      const module = this.requireModule();

      expect(module.register).to.throw(/Alarm handler not compliant/);
    });

    it('should not register handler when action is undefined', function() {
      const module = this.requireModule();

      delete handler.action;

      expect(() => module.register(handler)).to.throw(/Alarm handler not compliant/);
    });

    it('should not register handler when handle is undefined', function() {
      const module = this.requireModule();

      delete handler.handle;

      expect(() => module.register(handler)).to.throw(/Alarm handler not compliant/);
    });

    it('should not register handler when uniqueId is undefined', function() {
      const module = this.requireModule();

      delete handler.uniqueId;

      expect(() => module.register(handler)).to.throw(/Alarm handler not compliant/);
    });

    it('should not override current handler', function() {
      const module = this.requireModule();

      module.register(handler);
      module.register(handler);

      expect(module.get(action)).to.deep.equal([handler, handler]);
    });
  });

  it('should return handlers registered for the given action', function() {
    const module = this.requireModule();

    module.register(handler);

    expect(module.get(action)).to.deep.equal([handler]);
  });
});
