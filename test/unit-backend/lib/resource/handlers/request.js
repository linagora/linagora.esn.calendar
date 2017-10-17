const { expect } = require('chai');
const sinon = require('sinon');
const mockery = require('mockery');

describe('The Resource request handler module', function() {
  let resourceModule, emailModule, utilsModule, payload, resource;

  beforeEach(function() {
    payload = {
      ics: 'The ICS',
      eventId: '123',
      resourceId: '456',
      eventPath: '/foo/bar'
    };
    resource = { _id: 1, name: 'Room 1' };
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

    emailModule = {
      sender: {
        send: sinon.stub()
      }
    };

    utilsModule = {
      generateValidationLinks: sinon.stub()
    };

    mockery.registerMock('../utils', () => utilsModule);
    mockery.registerMock('../../email', () => emailModule);
    this.moduleHelpers.addDep('resource', resourceModule);
    this.requireModule = function() {
      return require(`${this.moduleHelpers.modulePath}/backend/lib/resource/handlers/request`)(this.moduleHelpers.dependencies);
    };
  });

  describe('The handler function', function() {
    it('should reject when resource can not be found', function(done) {
      resourceModule.lib.resource.get.returns(Promise.resolve());

      this.requireModule().handle(payload)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err.message).to.match(/has not been found/);
          expect(resourceModule.lib.resource.get).to.have.been.calledWith(payload.resourceId);
          done();
        });
    });

    it('should reject when links can not be generated', function(done) {
      const error = new Error('I failed');

      resourceModule.lib.resource.get.returns(Promise.resolve(resource));
      utilsModule.generateValidationLinks.returns(Promise.reject(error));
      resourceModule.lib.administrator.resolve.returns(Promise.resolve([]));

      this.requireModule().handle(payload)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err).to.equal(error);
          expect(resourceModule.lib.resource.get).to.have.been.calledWith(payload.resourceId);
          expect(utilsModule.generateValidationLinks).to.have.been.calledWith(payload.resourceId, payload.eventId);
          done();
        });
    });

    it('should reject when administrators can not be resolved', function(done) {
      const error = new Error('I failed');

      resourceModule.lib.resource.get.returns(Promise.resolve(resource));
      utilsModule.generateValidationLinks.returns(Promise.resolve({}));
      resourceModule.lib.administrator.resolve.returns(Promise.reject(error));

      this.requireModule().handle(payload)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err).to.equal(error);
          expect(resourceModule.lib.resource.get).to.have.been.calledWith(payload.resourceId);
          expect(resourceModule.lib.administrator.resolve).to.have.been.calledWith(resource);
          done();
        });
    });

    it('should send email', function(done) {
      const links = { yes: 1, no: 2 };
      const user1 = { _id: 1 };
      const user2 = { _id: 2 };

      resourceModule.lib.resource.get.returns(Promise.resolve(resource));
      utilsModule.generateValidationLinks.returns(Promise.resolve(links));
      resourceModule.lib.administrator.resolve.returns(Promise.resolve([user1, user2]));

      this.requireModule().handle(payload)
        .then(() => {
          expect(emailModule.sender.send).to.have.been.calledWith({
            to: [user1, user2],
            subject: sinon.match.any,
            ics: sinon.match.any,
            eventPath: payload.eventPath,
            emailTemplateName: 'resource.request',
            context: { links, resource }
          });
          done();
        })
        .catch(done);
    });
  });
});
