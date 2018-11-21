const expect = require('chai').expect;

describe('The i18n helpers lib', function() {
  let requireModule, esnConfigMock, inModuleMock;

  beforeEach(function() {
    esnConfigMock = key => {
      expect(key).to.equal('language');

      return {
        inModule: inModuleMock
      };
    };

    this.moduleHelpers.addDep('esn-config', esnConfigMock);

    requireModule = () => (require(this.moduleHelpers.modulePath + '/backend/lib/i18n/helpers')(this.moduleHelpers.dependencies));
  });

  describe('The getLocaleForUser function', function() {
    it('should get user language', function(done) {
      const user = { foo: 'bar' };
      const locale = 'vi';

      inModuleMock = moduleName => {
        expect(moduleName).to.equal('core');

        return {
          forUser: (user, isUserWide) => {
            expect(user).to.deep.equal(user);
            expect(isUserWide).to.be.true;

            return {
              get: callback => callback(null, locale)
            };
          }
        };
      };

      requireModule().getLocaleForUser(user).then(_locale => {
        expect(_locale).to.equal(locale);
        done();
      });
    });
  });

  describe('The getLocaleForSystem function', function() {
    it('should get system language', function(done) {
      const locale = 'vi';

      inModuleMock = moduleName => {
        expect(moduleName).to.equal('core');

        return {
          get: callback => callback(null, locale)
        };
      };

      requireModule().getLocaleForSystem().then(_locale => {
        expect(_locale).to.equal(locale);
        done();
      });
    });
  });
});
