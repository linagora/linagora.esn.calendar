const { expect } = require('chai');
const mockery = require('mockery');
const sinon = require('sinon');
const _ = require('lodash');
const { ObjectId } = require('bson');

describe('The calendar search Module', function() {
  let pubsubListen, deps, dependencies;
  let getModule;

  beforeEach(function() {
    deps = {
      elasticsearch: {},
      logger: {
        error: () => {},
        debug: () => {},
        info: () => {},
        warning: () => {}
      }
    };

    dependencies = name => deps[name];
    pubsubListen = sinon.spy();
    mockery.registerMock('./pubsub', _.constant({ listen: pubsubListen }));
    mockery.registerMock('./reindex', () => ({ register: () => {} }));

    getModule = () => require('../../../../backend/lib/search')(dependencies);
  });

  describe('The listen function', function() {
    it('should register listeners', function() {
      const register = sinon.spy();

      mockery.registerMock('./searchHandler', _.constant({ register: register }));

      getModule().listen();
      expect(register).to.have.been.calledOnce;
      expect(pubsubListen).to.have.been.calledOnce;
    });

    it('should register reindexing for calendar events', function() {
      const registerMock = sinon.spy();

      mockery.registerMock('./searchHandler', () => ({ register: () => {} }));
      mockery.registerMock('./reindex', () => ({ register: registerMock }));

      getModule().listen();
      expect(registerMock).to.have.been.calledOnce;
    });
  });

  describe('The indexEvent function', function() {

    it('should send back error when listener is not started', function(done) {
      getModule().indexEvent({}, this.helpers.callbacks.errorWithMessage(done, 'Event search is not initialized'));
    });

    describe('When initialized', function() {
      it('should send back error when contact is undefined', function(done) {
        mockery.registerMock('./searchHandler', _.constant({ register: _.constant({}) }));
        const module = getModule();

        module.listen();
        module.indexEvent(null, this.helpers.callbacks.errorWithMessage(done, 'Event is required'));
      });

      it('should call the indexData handler', function(done) {
        const contact = { id: '123', firstName: 'Bruce' };
        const indexDataMock = sinon.spy((data, callback) => {
          expect(data).to.deep.equal(contact);
          callback();
        });

        mockery.registerMock('./searchHandler', _.constant({ register: _.constant({ indexData: indexDataMock }) }));

        const module = getModule();

        module.listen();
        module.indexEvent(contact, this.helpers.callbacks.noError(done));
      });
    });
  });

  describe('The removeEventFromIndex function', function() {

    it('should send back error when listener is not started', function(done) {
      getModule().removeEventFromIndex({}, this.helpers.callbacks.errorWithMessage(done, 'Event search is not initialized'));
    });

    describe('When initialized', function() {

      it('should send back error when contact is undefined', function(done) {
        mockery.registerMock('./searchHandler', _.constant({ register: _.constant({}) }));
        const module = getModule();

        module.listen();
        module.removeEventFromIndex(null, this.helpers.callbacks.errorWithMessage(done, 'Event is required'));
      });

      it('should call the removeFromIndex handler', function(done) {
        const contact = {id: '123', firstName: 'Bruce'};

        const removeFromIndexMock = (data, callback) => {
          expect(data).to.deep.equal(contact);
          callback();
        };

        mockery.registerMock('./searchHandler', _.constant({ register: _.constant({ removeFromIndex: removeFromIndexMock }) }));
        const module = getModule();

        module.listen();
        module.removeEventFromIndex(contact, this.helpers.callbacks.noError(done));
      });
    });
  });

  describe('The searchEvents function', function() {
    it('should call search.searchDocuments with right parameters using default parameters for unset ones', function() {
      const query = {
        search: 'Bruce',
        offset: 10,
        limit: 100,
        userId: new ObjectId()
      };

      deps.elasticsearch.searchDocuments = sinon.spy();

      const searchConstants = require('../../../../backend/lib/constants').SEARCH;
      const defaultSort = {};

      defaultSort[searchConstants.DEFAULT_SORT_KEY] = { order: searchConstants.DEFAULT_SORT_ORDER };

      getModule().searchEvents(query);
      expect(deps.elasticsearch.searchDocuments).to.have.been.calledWith(sinon.match({
        index: 'events.idx',
        type: 'events',
        from: query.offset,
        size: query.limit,
        body: {
          sort: defaultSort
        }
      }));
    });

    it('should be able to search document with limit = 0', function() {
      const query = {
        search: 'Bruce',
        offset: 10,
        limit: 0,
        userId: new ObjectId()
      };

      deps.elasticsearch.searchDocuments = sinon.spy();

      const searchConstants = require('../../../../backend/lib/constants').SEARCH;
      const defaultSort = {};

      defaultSort[searchConstants.DEFAULT_SORT_KEY] = { order: searchConstants.DEFAULT_SORT_ORDER };

      getModule().searchEvents(query);
      expect(deps.elasticsearch.searchDocuments).to.have.been.calledWith(sinon.match({
        index: 'events.idx',
        type: 'events',
        from: query.offset,
        size: 0,
        body: {
          sort: defaultSort
        }
      }));
    });

    it('should call search.searchDocuments with right parameters', function() {
      const query = {
        search: 'Bruce',
        offset: 10,
        limit: 100,
        sortKey: 'sortKey',
        sortOrder: 'sortOrder',
        userId: new ObjectId()
      };

      deps.elasticsearch.searchDocuments = sinon.spy();

      getModule().searchEvents(query);
      expect(deps.elasticsearch.searchDocuments).to.have.been.calledWith(sinon.match({
        index: 'events.idx',
        type: 'events',
        from: query.offset,
        size: query.limit,
        body: {
          sort: {
            sortKey: { order: 'sortOrder' }
          }
        }
      }));
    });

    it('should send back error when search.searchDocuments fails', function(done) {
      const query = {
        search: 'Bruce',
        offset: 10,
        limit: 100,
        userId: new ObjectId()
      };

      deps.elasticsearch.searchDocuments = function(options, callback) {
        return callback(new Error());
      };

      getModule().searchEvents(query, this.helpers.callbacks.error(done));
    });

    it('should send back result when search.searchDocuments is successful', function(done) {
      const query = {
        search: 'Bruce',
        offset: 10,
        limit: 100,
        userId: new ObjectId()
      };
      const total = 10;
      const hits = [{_id: 1}, {_id: 2}];

      deps.elasticsearch.searchDocuments = (options, callback) => callback(null, {
        hits: {
          total: total,
          hits: hits
        }
      });

      getModule().searchEvents(query, function(err, result) {
        expect(err).to.not.exist;
        expect(result.total_count).to.equal(total);
        expect(result.list).to.deep.equal(hits);
        done();
      });
    });
  });

  describe('The searchNextEvent function', function() {
    it('should call search.searchDocuments with right parameters', function() {
      deps.elasticsearch.searchDocuments = sinon.spy();

      getModule().searchNextEvent({ id: 'userId' });

      expect(deps.elasticsearch.searchDocuments).to.have.been.calledWith({
        index: 'events.idx',
        type: 'events',
        from: 0,
        size: 1,
        body: {
          sort: {
            start: {
              order: 'asc'
            }
          },
          query: {
            bool: {
              filter: {
                and: [{
                  term: {
                    userId: 'userId'
                  }
                }]
              },
              must: {
                range: {
                  start: {
                    gt: 'now'
                  }
                }
              }
            }
          }
        }
      });
    });
  });
});
