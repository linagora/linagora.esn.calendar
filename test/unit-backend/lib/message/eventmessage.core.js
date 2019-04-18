const expect = require('chai').expect;
const mockery = require('mockery');

describe('The event message module', function() {
  let module, localstub, globalstub;
  let eventMessageMock;

  beforeEach(function() {
    localstub = {};
    globalstub = {};

    eventMessageMock = function() {
      return eventMessageMock;
    };

    this.moduleHelpers.addDep('pubsub', this.helpers.mock.pubsub('', localstub, globalstub));
    this.moduleHelpers.addDep('db', {
      mongo: {
        mongoose: {
          model: () => eventMessageMock
        }
      }
    });
    mockery.registerMock('./eventmessage.model', function() {});
  });

  describe('The save fn', function() {
    it('should not publish in topic message:stored if there was an error', function(done) {
      eventMessageMock.save = function(callback) {
        return callback(new Error());
      };

      module = require(this.moduleHelpers.backendPath + '/lib/message/eventmessage.core')(this.moduleHelpers.dependencies);
      module.save({}, function(err) {
        expect(err).to.exist;
        expect(localstub.topics['message:stored'].data).to.have.length(0);
        done();
      });
    });

    it('should publish in topic message:stored if there is no error', function(done) {
      const ObjectId = require('bson').ObjectId;
      const messageSaved = {
        _id: new ObjectId()
      };

      eventMessageMock.save = function(callback) {
        return callback(null, messageSaved);
      };

      module = require(this.moduleHelpers.backendPath + '/lib/message/eventmessage.core')(this.moduleHelpers.dependencies);
      module.save({}, function(err, saved) {
        expect(err).to.not.exist;
        expect(saved).to.exist;
        expect(localstub.topics['message:stored'].data[0]).to.deep.equal(messageSaved);
        done();
      });
    });
  });
});
