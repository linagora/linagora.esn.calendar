const { expect } = require('chai');
const sinon = require('sinon');

describe('The resource middleware', function() {
  let resourceModule, preferredDomainId, technicalUsers, technicalUserModule, resource, resourceId, req, error, user;

  beforeEach(function() {
    error = new Error('I failed');
    preferredDomainId = 'A domain';
    technicalUsers = [1, 2, 3];
    user = {_id: 1, preferredDomainId};
    resourceId = 'resourceId';
    req = {
      params: {
        resourceId
      },
      user
    };
    resource = {
      _id: resourceId,
      administrators: [{ _id: 2 }]
    };
    resourceModule = {
      lib: {
        resource: {
          get: sinon.stub()
        },
        administrator: {
          resolve: sinon.stub()
        }
      }
    };
    technicalUserModule = {};

    this.moduleHelpers.addDep('resource', resourceModule);
    this.moduleHelpers.addDep('technical-user', technicalUserModule);

    this.loadModule = () => require(`${this.moduleHelpers.backendPath}/webserver/api/resources/middleware`)(this.moduleHelpers.dependencies);
  });

  describe('The getTechnicalUserToken function', function() {
    it('should 500 when technicalUserModule.findByTypeAndDomain fails', function(done) {
      technicalUserModule.findByTypeAndDomain = sinon.spy((type, domain, callback) => {
        callback(error);
      });

      this.loadModule().getTechnicalUserToken(req, {
        status: status => {
          expect(status).to.equals(500);

          return {
            json: json => {
              expect(technicalUserModule.findByTypeAndDomain).to.have.been.calledWith('dav', preferredDomainId, sinon.match.func);
              expect(json.error.details).to.match(/Error while getting technical user/);
              done();
            }
          };
        }
      }, () => done(new Error('Should not be called')));
    });

    it('should 404 when technicalUserModule.findByTypeAndDomain does not return any technical user', function(done) {
      technicalUserModule.findByTypeAndDomain = sinon.spy((type, domain, callback) => {
        callback();
      });

      this.loadModule().getTechnicalUserToken(req, {
        status: status => {
          expect(status).to.equals(404);

          return {
            json: json => {
              expect(technicalUserModule.findByTypeAndDomain).to.have.been.calledWith('dav', preferredDomainId, sinon.match.func);
              expect(json.error.details).to.match(/Can not find technical user for resource management/);
              done();
            }
          };
        }
      }, () => done(new Error('Should not be called')));
    });

    it('should 500 when technicalUser token generation fails', function(done) {
      technicalUserModule.findByTypeAndDomain = sinon.spy((type, domain, callback) => {
        callback(null, technicalUsers);
      });
      technicalUserModule.getNewToken = sinon.spy((user, ttl, callback) => {
        callback(error);
      });

      this.loadModule().getTechnicalUserToken(req, {
        status: status => {
          expect(status).to.equals(500);

          return {
            json: json => {
              expect(technicalUserModule.findByTypeAndDomain).to.have.been.called;
              expect(technicalUserModule.getNewToken).to.have.been.calledWith(technicalUsers[0]);
              expect(json.error.details).to.match(/Error while generating technical user token/);
              done();
            }
          };
        }
      }, () => done(new Error('Should not be called')));
    });

    it('should 500 when technicalUser token can not be generated', function(done) {
      technicalUserModule.findByTypeAndDomain = sinon.spy((type, domain, callback) => {
        callback(null, technicalUsers);
      });
      technicalUserModule.getNewToken = sinon.spy((user, ttl, callback) => {
        callback();
      });

      this.loadModule().getTechnicalUserToken(req, {
        status: status => {
          expect(status).to.equals(500);

          return {
            json: json => {
              expect(technicalUserModule.findByTypeAndDomain).to.have.been.called;
              expect(technicalUserModule.getNewToken).to.have.been.calledWith(technicalUsers[0]);
              expect(json.error.details).to.match(/Can not generate technical user token/);
              done();
            }
          };
        }
      }, () => done(new Error('Should not be called')));
    });

    it('should set the token in the request', function(done) {
      const token = 123;

      technicalUserModule.findByTypeAndDomain = sinon.spy((type, domain, callback) => {
        callback(null, technicalUsers);
      });
      technicalUserModule.getNewToken = sinon.spy((user, ttl, callback) => {
        callback(null, token);
      });

      this.loadModule().getTechnicalUserToken(req, {
        status: () => done(new Error('Should not be called'))
      }, () => {
        expect(req.token).to.equal(token);
        done();
      });
    });
  });

  describe('The load function', function() {
    it('should 404 when resource is not found', function(done) {
      resourceModule.lib.resource.get.returns(Promise.resolve());

      this.loadModule().load(req, {
        status: status => {
          expect(status).to.equals(404);

          return {
            json: json => {
              expect(resourceModule.lib.resource.get).to.have.been.calledWith(resourceId);
              expect(json.error.details).to.match(/has not been found/);
              done();
            }
          };
        }
      }, () => done(new Error('Should not be called')));
    });

    it('should 500 when resource.get fails', function(done) {
      resourceModule.lib.resource.get.returns(Promise.reject(error));

      this.loadModule().load(req, {
        status: status => {
          expect(status).to.equals(500);

          return {
            json: json => {
              expect(resourceModule.lib.resource.get).to.have.been.calledWith(resourceId);
              expect(json.error.details).to.match(/Error while getting the resource/);
              done();
            }
          };
        }
      }, () => done(new Error('Should not be called')));
    });

    it('should set resource in request', function(done) {
      resourceModule.lib.resource.get.returns(Promise.resolve(resource));

      this.loadModule().load(req, {
        status: () => {
          done(new Error('Should not be called'));

          return { json: () => {}};
        }
      }, () => {
        expect(resourceModule.lib.resource.get).to.have.been.calledWith(resourceId);
        expect(req.resource).to.equal(resource);
        done();
      });
    });
  });

  describe('The requiresCurrentUserAsAdministrator function', function() {
    it('should 400 when resource does not have administrators', function(done) {
      delete resource.administrators;
      req.resource = resource;
      resourceModule.lib.administrator.resolve.returns(Promise.resolve(resource));

      this.loadModule().requiresCurrentUserAsAdministrator(req, {
        status: status => {
          expect(status).to.equals(400);

          return {
            json: json => {
              expect(resourceModule.lib.administrator.resolve).to.have.been.calledWith(req.resource);
              expect(json.error.details).to.match(/Can not manage such resource/);
              done();
            }
          };
        }
      }, () => done(new Error('Should not be called')));
    });

    it('should 500 when administrator lib rejects', function(done) {
      req.resource = resource;
      resourceModule.lib.administrator.resolve.returns(Promise.reject(error));

      this.loadModule().requiresCurrentUserAsAdministrator(req, {
        status: status => {
          expect(status).to.equals(500);

          return {
            json: json => {
              expect(resourceModule.lib.administrator.resolve).to.have.been.calledWith(req.resource);
              expect(json.error.details).to.match(/Error while getting resource administrators/);
              done();
            }
          };
        }
      }, () => done(new Error('Should not be called')));
    });

    it('should 403 when current user is not admin', function(done) {
      req.resource = resource;
      resourceModule.lib.administrator.resolve.returns(Promise.resolve(resource.administrators));

      this.loadModule().requiresCurrentUserAsAdministrator(req, {
        status: status => {
          expect(status).to.equals(403);

          return {
            json: json => {
              expect(resourceModule.lib.administrator.resolve).to.have.been.calledWith(req.resource);
              expect(json.error.details).to.match(/Can not manage such resource/);
              done();
            }
          };
        }
      }, () => done(new Error('Should not be called')));
    });

    it('should call next when user is admin', function(done) {
      resource.administrators.push(user);
      req.resource = resource;
      resourceModule.lib.administrator.resolve.returns(Promise.resolve(resource.administrators));

      this.loadModule().requiresCurrentUserAsAdministrator(req, {
        status: () => {
          done(new Error('Should not be called'));

          return { json: () => {}};
        }
      }, () => {
        done();
      });
    });
  });

  describe('The requiresStatusQueryParameter function', function() {
    beforeEach(function() {
      req.query = {};
    });

    it('should 400 when req.query.status is not defined', function(done) {
      this.loadModule().requiresStatusQueryParameter(req, {
        status: status => {
          expect(status).to.equals(400);

          return {
            json: json => {
              expect(json.error.details).to.match(/status is required/);
              done();
            }
          };
        }
      }, () => done(new Error('Should not be called')));

    });

    it('should call next', function(done) {
      req.query.status = 'a status';
      this.loadModule().requiresStatusQueryParameter(req, {
        status: () => {
          done(new Error('Should not be called'));

          return { json: () => {}};
        }
      }, () => {
        done();
      });
    });
  });
});
