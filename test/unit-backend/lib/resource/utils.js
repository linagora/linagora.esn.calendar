const { expect } = require('chai');
const sinon = require('sinon');

describe('The resource utils lib', function() {
  let helpers, module, error, endpoint, davserver, baseUrl;

  beforeEach(function() {
    error = null;
    helpers = {
      config: {
        getBaseUrl: (arg, callback) => callback(error, baseUrl)
      }
    };
    endpoint = 'http://dav';
    davserver = {
      utils: {
        getDavEndpoint: sinon.spy(function(user, callback) {
          callback(null, endpoint);
        })
      }
    };
    this.moduleHelpers.addDep('helpers', helpers);
    this.moduleHelpers.addDep('davserver', davserver);
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
      const referer = 'email';

      baseUrl = url;

      module.generateValidationLinks(resourceId, eventId, referer)
        .then(links => {
          expect(links).to.deep.equals({
            yes: `${url}/calendar/api/resources/${resourceId}/${eventId}/participation?status=ACCEPTED&referrer=${referer}`,
            no: `${url}/calendar/api/resources/${resourceId}/${eventId}/participation?status=DECLINED&referrer=${referer}`
          });
          done();
        })
        .catch(done);
    });
  });

  describe('The getCalendarUrl function', function() {
    let resourceId;

    beforeEach(function() {
      resourceId = 1;
      module = require(this.moduleHelpers.backendPath + '/lib/resource/utils')(this.moduleHelpers.dependencies);
    });

    it('should resolve with correct url', function(done) {
      module.getCalendarUrl(resourceId).then(url => {
        expect(url).to.equal(`${endpoint}/calendars/${resourceId}.json`);
        done();
      });
    });
  });

  describe('The getEventUrl function', function() {
    let resourceId, eventId;

    beforeEach(function() {
      resourceId = 1;
      eventId = 2;
      module = require(this.moduleHelpers.backendPath + '/lib/resource/utils')(this.moduleHelpers.dependencies);
    });

    it('should resolve with correct url', function(done) {
      module.getEventUrl(resourceId, eventId).then(url => {
        expect(url).to.equal(`${endpoint}/calendars/${resourceId}/${eventId}.ics`);
        done();
      });
    });
  });
});
