const {expect} = require('chai');
const mockery = require('mockery');

describe('The calendar core module', function() {
  let collaborationMock;
  let eventMessageMock;
  let userMock;
  let activityStreamHelperMock;
  let helpersMock;
  let pubsubMock;
  let configMock;
  let authMock;
  let elasticsearchActionsMock;
  let elasticsearchActions;
  let caldavClientMock;
  let caldavClientLib;
  let emailMock;
  let esnConfigMock;

  function initMock() {
    collaborationMock = {
      permission: {
        _write: true,
        canWrite: function(collaboration, user, callback) {
          return callback(null, this._write);
        }
      }
    };
    eventMessageMock = function() {
      return {};
    };
    userMock = {
      getDisplayName: user => user.firstname + ' ' + user.lastname,
      _user: {},
      _err: null,
      get: function(id, callback) {
        return callback(this._err, this._user);
      },
      findByEmail: function(email, callback) {
        return callback(this._err, this._user);
      }
    };
    activityStreamHelperMock = {
      helpers: {
        userMessageToTimelineEntry: function() {
        }
      }
    };
    helpersMock = {
      message: {
        messageSharesToTimelineTarget: function() {}
      },
      array: {
        isNullOrEmpty: function(array) {
          return (!Array.isArray(array) || array.length === 0);
        }
      },
      config: {
        getBaseUrl: function(user, callback) {
          callback();
        }
      }
    };
    pubsubMock = {
      local: {
        topic: function() {
          return {
            forward: function() {}
          };
        }
      },
      global: {}
    };
    configMock = function() {
      return {
        webserver: {}
      };
    };
    authMock = {
      jwt: {
        generateWebToken: function(p, callback) {
          expect(p).to.exist;
          callback(null, 'token');
        }
      }
    };
    elasticsearchActionsMock = {};
    elasticsearchActions = function() {
      return elasticsearchActionsMock;
    };
    caldavClientMock = {};
    caldavClientLib = function() {
      return caldavClientMock;
    };
    emailMock = {
      getMailer: function() { return {}; }
    };
    esnConfigMock = function(confName) {
      expect(confName).to.equal('locale');
      return {
        inModule: function(mod) {
          expect(mod).to.equal('core');
          return {
            forUser: () => {}
          };
        }
      };
    };
  }

  beforeEach(function() {
    initMock();
    mockery.registerMock('./../../../lib/message/eventmessage.core', eventMessageMock);
    mockery.registerMock('../../../lib/search/actions', elasticsearchActions);
    mockery.registerMock('../../../lib/caldav-client', caldavClientLib);
    this.moduleHelpers.addDep('user', userMock);
    this.moduleHelpers.addDep('collaboration', collaborationMock);
    this.moduleHelpers.addDep('activitystreams', activityStreamHelperMock);
    this.moduleHelpers.addDep('helpers', helpersMock);
    this.moduleHelpers.addDep('pubsub', pubsubMock);
    this.moduleHelpers.addDep('config', configMock);
    this.moduleHelpers.addDep('auth', authMock);
    this.moduleHelpers.addDep('email', emailMock);
    this.moduleHelpers.addDep('esn-config', esnConfigMock);
    this.moduleHelpers.addDep('i18n', this.helpers.requireBackend('core/i18n'));
  });

  describe('The dispatch fn', function() {
    beforeEach(function() {
      this.module = require(this.moduleHelpers.backendPath + '/webserver/api/calendar/core')(this.moduleHelpers.dependencies);
    });
    it('should return an error if data is undefined', function(done) {
      this.module.dispatch(null, function(err) {
        expect(err).to.exist;
        done();
      });
    });

    it('should return an error if data is not an object', function(done) {
      this.module.dispatch('test', function(err) {
        expect(err).to.exist;
        done();
      });
    });

    it('should return an error if data.user is undefined', function(done) {
      var data = {
        collaboration: {},
        event: {
          event_id: '',
          type: ''
        }
      };

      this.module.dispatch(data, function(err) {
        expect(err).to.exist;
        done();
      });
    });

    it('should return an error if data.collaboration is undefined', function(done) {
      var data = {
        user: {},
        event: {
          event_id: '',
          type: ''
        }
      };

      this.module.dispatch(data, function(err) {
        expect(err).to.exist;
        done();
      });
    });

    it('should return an error if data.event is an object', function(done) {
      var data = {
        user: {},
        collaboration: {},
        event: 'test'
      };

      this.module.dispatch(data, function(err) {
        expect(err).to.exist;
        done();
      });
    });

    it('should return an error if data.event.event_id is undefined', function(done) {
      var data = {
        user: {},
        collaboration: {},
        event: {
          type: ''
        }
      };

      this.module.dispatch(data, function(err) {
        expect(err).to.exist;
        done();
      });
    });

    it('should return an error if data.event.type is undefined', function(done) {
      var data = {
        user: {},
        collaboration: {},
        event: {
          event_id: ''
        }
      };

      this.module.dispatch(data, function(err) {
        expect(err).to.exist;
        done();
      });
    });

    it('should return an error if data.event.type is not "created"', function(done) {
      var data = {
        user: {},
        collaboration: {},
        event: {
          event_id: '123',
          type: 'test'
        }
      };

      this.module.dispatch(data, function(err) {
        expect(err).to.exist;
        done();
      });
    });

    it('should return false if the user does not have write permission', function(done) {
      collaborationMock.permission._write = false;
      this.moduleHelpers.addDep('collaboration', collaborationMock);

      var user = {
        _id: '123',
        firstname: 'test'
      };
      var collaboration = {
        _id: '345',
        activity_stream: {
          uuid: '42'
        }
      };
      var data = {
        user: user,
        collaboration: collaboration,
        event: {
          event_id: 'event id',
          type: 'created'
        }
      };

      this.module.dispatch(data, function(err, result) {
        expect(err).to.not.exist;
        expect(result).to.exist;
        expect(result).to.be.false;
        done();
      });
    });

    it('should call the create function', function(done) {
      collaborationMock.permission._write = true;
      var user = {
        _id: '123',
        firstname: 'test'
      };
      var collaboration = {
        _id: '345',
        activity_stream: {
          uuid: '42'
        }
      };
      var data = {
        user: user,
        collaboration: collaboration,
        event: {
          event_id: 'event id',
          type: 'created'
        }
      };

      eventMessageMock = function() {
        return {
          _object: {
            _id: '123123',
            objectType: 'event',
            shares: [{
              _id: '890890',
              objectType: 'activitystream',
              id: collaboration.activity_stream.uuid
            }]
          },
          save: function(message, callback) {
            callback(null, this._object);
          }
        };
      };
      mockery.registerMock('./../../../lib/message/eventmessage.core', eventMessageMock);

      this.module = require(this.moduleHelpers.backendPath + '/webserver/api/calendar/core')(this.moduleHelpers.dependencies);
      this.module.dispatch(data, function(err, result) {
        expect(err).to.not.exist;
        expect(result).to.exist;
        expect(result._id).to.equal('123123');
        expect(result.objectType).to.equal('event');
        done();
      });
    });
  });
});
