const sinon = require('sinon');
const fs = require('fs');
const { expect } = require('chai');

describe('The links helper', function() {
  let ics, url, eventPath;

  beforeEach(function() {
    this.calendarModulePath = this.moduleHelpers.modulePath;
    url = 'http://open-paas.org';
    eventPath = '/calendars/userId/calendarId/eventId.ics';
    ics = fs.readFileSync(this.calendarModulePath + '/test/unit-backend/fixtures/withVALARM.ics').toString('utf8');

    this.requireModule = function() {
      return require(this.calendarModulePath + '/backend/lib/helpers/links')(this.moduleHelpers.dependencies);
    };
  });

  describe('The getEventInCalendar function', function() {
    it('should reject if baseURL retrieval fails', function(done) {
      const error = new Error('I failed to get baseURL');
      const spy = sinon.spy(function(user, callback) {
        callback(error);
      });

      this.moduleHelpers.addDep('helpers', {
        config: {
          getBaseUrl: spy
        }
      });

      this.requireModule().getEventInCalendar(ics)
        .then(() => done(new Error('Should not be called')))
        .catch(err => {
          expect(err).to.equal(error);
          expect(spy).to.have.been.calledOnce;
          done();
        });
    });

    it('should resolve with valid URL', function(done) {
      const spy = sinon.spy(function(user, callback) {
        callback(null, url);
      });

      this.moduleHelpers.addDep('helpers', {
        config: {
          getBaseUrl: spy
        }
      });

      this.requireModule().getEventInCalendar(ics)
        .then(result => {
          expect(spy).to.have.been.calledOnce;
          expect(result).to.equal(`${url}/calendar/#/calendar?start=06-12-2115`);
          done();
        })
        .catch(done);
    });
  });

  describe('The getEventDetails function', function() {
    it('should reject if baseURL retrieval fails', function(done) {
      const error = new Error('I failed to get baseURL');
      const spy = sinon.spy(function(user, callback) {
        callback(error);
      });

      this.moduleHelpers.addDep('helpers', {
        config: {
          getBaseUrl: spy
        }
      });

      this.requireModule().getEventDetails(eventPath)
        .then(() => done(new Error('Should not be called')))
        .catch(err => {
          expect(err).to.equal(error);
          expect(spy).to.have.been.calledOnce;
          done();
        });
    });

    it('should resolve with valid URL', function(done) {
      const spy = sinon.spy(function(user, callback) {
        callback(null, url);
      });

      this.moduleHelpers.addDep('helpers', {
        config: {
          getBaseUrl: spy
        }
      });

      this.requireModule().getEventDetails(eventPath)
        .then(result => {
          expect(spy).to.have.been.calledOnce;
          expect(result).to.equal(`${url}/calendar/#/calendar/calendarId/event/eventId/consult`);
          done();
        })
        .catch(done);
    });
  });
});
