const sinon = require('sinon');
const { expect } = require('chai');

describe('The technical-user helper', function() {
  let domainId;

  beforeEach(function() {
    domainId = 'abc';
    this.calendarModulePath = this.moduleHelpers.modulePath;

    this.requireModule = function() {
      return require(this.calendarModulePath + '/backend/lib/helpers/technical-user')(this.moduleHelpers.dependencies);
    };
  });

  describe('The getTechnicalUserToken function', function() {
    it('should reject if findByTypeAndDomain retrieval fails', function(done) {
      const error = new Error('I failed to get technicalUser');
      const spy = sinon.spy(function(TECHNICAL_USER_TYPE, domainId, callback) {
        callback(error);
      });

      this.moduleHelpers.addDep('technical-user', {
        findByTypeAndDomain: spy
      });

      this.requireModule().getTechnicalUserToken(domainId)
        .then(() => done(new Error('Should not be called')))
        .catch(err => {
          expect(err).to.equal(error);
          expect(spy).to.have.been.calledOnce;
          done();
        });
    });

    it('should reject if getNewToken retrieval fails', function(done) {
        const error = new Error('I failed to get new token');
        const findByTypeAndDomainSpy = sinon.spy(function(technicalUser, ttl, callback) {
            callback(null, ['technical-user1']);
          });
        const getNewTokenSpy = sinon.spy(function(technicalUser, ttl, callback) {
          callback(error);
        });

        this.moduleHelpers.addDep('technical-user', {
            findByTypeAndDomain: findByTypeAndDomainSpy,
            getNewToken: getNewTokenSpy
        });

        this.requireModule().getTechnicalUserToken(domainId)
          .then(() => done(new Error('Should not be called')))
          .catch(err => {
            expect(err).to.equal(error);
            expect(findByTypeAndDomainSpy).to.have.been.calledOnce;
            expect(getNewTokenSpy).to.have.been.calledOnce;
            done();
          });
      });

      it('should resolve with token object', function(done) {
        const technicalUserToken = { token: 'token' };
        const findByTypeAndDomainSpy = sinon.spy(function(technicalUser, ttl, callback) {
            callback(null, ['technical-user1']);
          });
        const getNewTokenSpy = sinon.spy(function(technicalUser, ttl, callback) {
          callback(null, technicalUserToken);
        });

        this.moduleHelpers.addDep('technical-user', {
            findByTypeAndDomain: findByTypeAndDomainSpy,
            getNewToken: getNewTokenSpy
        });

        this.requireModule().getTechnicalUserToken(domainId)
            .then(token => {
                expect(findByTypeAndDomainSpy).to.have.been.calledOnce;
                expect(getNewTokenSpy).to.have.been.calledOnce;
                expect(token).to.equal(technicalUserToken);
                done();
            })
            .catch(done);
      });
    });
});
