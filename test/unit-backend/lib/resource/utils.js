const { expect } = require('chai');

describe('The resource utils lib', function() {
  let helpers, module, error, baseUrl;

  beforeEach(function() {
    error = null;
    helpers = {
      config: {
        getBaseUrl: (arg, callback) => callback(error, baseUrl)
      }
    };
    this.moduleHelpers.addDep('helpers', helpers);
  });

  describe('The generateValidationLinks function', function() {
    let resourceId, eventId, url;

    beforeEach(function() {
      url = 'http://open-paas.org';
      resourceId = 1;
      eventId = 2;
      module = require(this.moduleHelpers.backendPath + '/lib/resource/utils')(this.moduleHelpers.dependencies);
    });

    it('should reject when helpers.config.getBaseUrl rejects', function(done) {
      error = new Error();

      module.generateValidationLinks(resourceId, eventId)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err).to.equal(error);
          done();
        });
    });

    it('should generate valid links', function(done) {
      baseUrl = url;

      module.generateValidationLinks(resourceId, eventId)
        .then(links => {
          expect(links).to.deep.equals({
            yes: `${url}/calendar/api/resources/${resourceId}/${eventId}/participation?status=ACCEPTED`,
            no: `${url}/calendar/api/resources/${resourceId}/${eventId}/participation?status=DECLINED`
          });
          done();
        })
        .catch(done);
    });
  });
});
