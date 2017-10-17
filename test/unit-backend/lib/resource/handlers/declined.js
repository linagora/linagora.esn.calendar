const { expect } = require('chai');
const sinon = require('sinon');
const mockery = require('mockery');

describe('The Resource declined handler module', function() {
  let resourceModule, emailModule, payload, resource, jcalHelper, email;

  beforeEach(function() {
    email = 'organizer@open-paas.org';
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

    jcalHelper = {
      jcal2content: sinon.stub()
    };

    mockery.registerMock('../../email', () => emailModule);
    mockery.registerMock('../../helpers/jcal', jcalHelper);
    this.moduleHelpers.addDep('resource', resourceModule);
    this.requireModule = function() {
      return require(`${this.moduleHelpers.modulePath}/backend/lib/resource/handlers/declined`)(this.moduleHelpers.dependencies);
    };
  });

  describe('The handle function', function() {
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

    it('should reject when there are no organizer in the ICS', function(done) {
      jcalHelper.jcal2content.returns({});
      resourceModule.lib.resource.get.returns(Promise.resolve(resource));

      this.requireModule().handle(payload)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err.message).to.match(/Organizer email can not be found in ICS/);
          expect(resourceModule.lib.resource.get).to.have.been.calledWith(payload.resourceId);
          done();
        });
    });

    it('should reject when there are no organizer email in the ICS', function(done) {
      jcalHelper.jcal2content.returns({organizer: {}});
      resourceModule.lib.resource.get.returns(Promise.resolve(resource));

      this.requireModule().handle(payload)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err.message).to.match(/Organizer email can not be found in ICS/);
          expect(resourceModule.lib.resource.get).to.have.been.calledWith(payload.resourceId);
          done();
        });
    });

    it('should reject when email can not be sent', function(done) {
      const error = new Error('I failed to send email');

      emailModule.sender.send.returns(Promise.reject(error));
      jcalHelper.jcal2content.returns({organizer: {email}});
      resourceModule.lib.resource.get.returns(Promise.resolve(resource));

      this.requireModule().handle(payload)
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err).to.equal(error);
          expect(resourceModule.lib.resource.get).to.have.been.calledWith(payload.resourceId);
          done();
        });
    });

    it('should send email', function(done) {
      resourceModule.lib.resource.get.returns(Promise.resolve(resource));
      jcalHelper.jcal2content.returns({organizer: {email}});

      this.requireModule().handle(payload)
        .then(() => {
          expect(emailModule.sender.send).to.have.been.calledWith({
            to: email,
            subject: sinon.match.any,
            ics: sinon.match.any,
            eventPath: payload.eventPath,
            emailTemplateName: 'resource.declined',
            context: { resource }
          });
          done();
        })
        .catch(done);
    });
  });
});
