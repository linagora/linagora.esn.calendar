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

  describe('The searchEventsBasic function', function() {
    it('should call elasticsearch.searchDocuments with right parameters using default parameters for unset ones', function() {
      const query = {
        search: 'Bruce',
        offset: 10,
        limit: 100,
        userId: new ObjectId().toString(),
        calendarId: new ObjectId().toString()
      };

      deps.elasticsearch.searchDocuments = sinon.spy();

      const searchConstants = require('../../../../backend/lib/constants').SEARCH;
      const defaultSort = {};

      defaultSort[searchConstants.DEFAULT_SORT_KEY] = { order: searchConstants.DEFAULT_SORT_ORDER };

      getModule().searchEventsBasic(query);
      expect(deps.elasticsearch.searchDocuments).to.have.been.calledWith(sinon.match({
        index: 'events.idx',
        type: 'events',
        from: query.offset,
        size: query.limit,
        body: {
          sort: defaultSort,
          query: {
            bool: {
              filter: {
                term: {
                  calendarId: query.calendarId
                }
              }
            }
          }
        }
      }));
    });

    it('should be able to search document with limit = 0', function() {
      const query = {
        search: 'Bruce',
        offset: 10,
        limit: 0,
        userId: new ObjectId().toString(),
        calendarId: new ObjectId().toString()
      };

      deps.elasticsearch.searchDocuments = sinon.spy();

      const searchConstants = require('../../../../backend/lib/constants').SEARCH;
      const defaultSort = {};

      defaultSort[searchConstants.DEFAULT_SORT_KEY] = { order: searchConstants.DEFAULT_SORT_ORDER };

      getModule().searchEventsBasic(query);
      expect(deps.elasticsearch.searchDocuments).to.have.been.calledWith(sinon.match({
        index: 'events.idx',
        type: 'events',
        from: query.offset,
        size: 0,
        body: {
          sort: defaultSort,
          query: {
            bool: {
              filter: {
                term: {
                  calendarId: query.calendarId
                }
              }
            }
          }
        }
      }));
    });

    it('should call elasticsearch.searchDocuments with right parameters', function() {
      const query = {
        search: 'Bruce',
        offset: 10,
        limit: 100,
        sortKey: 'sortKey',
        sortOrder: 'sortOrder',
        userId: new ObjectId().toString(),
        calendarId: new ObjectId().toString()
      };

      deps.elasticsearch.searchDocuments = sinon.spy();

      getModule().searchEventsBasic(query);
      expect(deps.elasticsearch.searchDocuments).to.have.been.calledWith(sinon.match({
        index: 'events.idx',
        type: 'events',
        from: query.offset,
        size: query.limit,
        body: {
          sort: {
            sortKey: { order: 'sortOrder' }
          },
          query: {
            bool: {
              filter: {
                term: {
                  calendarId: query.calendarId
                }
              }
            }
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

      getModule().searchEventsBasic(query, this.helpers.callbacks.error(done));
    });

    it('should send back result when search.searchDocuments is successful', function(done) {
      const query = {
        search: 'Bruce',
        offset: 10,
        limit: 100,
        userId: new ObjectId().toString(),
        calendarId: new ObjectId().toString()
      };
      const total = 10;
      const hits = [{_id: 1}, {_id: 2}];

      deps.elasticsearch.searchDocuments = (options, callback) => callback(null, {
        hits: {
          total: total,
          hits: hits
        }
      });

      getModule().searchEventsBasic(query, function(err, result) {
        expect(err).to.not.exist;
        expect(result.total_count).to.equal(total);
        expect(result.list).to.deep.equal(hits);
        done();
      });
    });
  });

  describe('The searchNextEvent function', function() {
    it('should call elasticsearch.searchDocuments with right parameters', function() {
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
              filter: { term: { userId: 'userId' } },
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

  describe('The searchEventsAdvanced function', function() {
    var advancedQuery;

    beforeEach(function() {
      advancedQuery = {
        calendars: [
          { userId: 'userId1', calendarId: 'userId1' },
          { userId: 'userId1', calendarId: 'calId1' },
          { userId: 'userId2', calendarId: 'calId2' }
        ],
        search: 'king',
        offset: 0,
        limit: 30
      };
    });

    it('should call elasticsearch.searchDocuments with correct basic parameters', function() {
      deps.elasticsearch.searchDocuments = sinon.spy();

      const module = require('../../../../backend/lib/search')(dependencies);
      const searchConstants = require('../../../../backend/lib/constants').SEARCH;
      const defaultSort = {};

      defaultSort[searchConstants.DEFAULT_SORT_KEY] = { order: searchConstants.DEFAULT_SORT_ORDER };

      module.searchEventsAdvanced(advancedQuery);

      expect(deps.elasticsearch.searchDocuments).to.have.been.calledWith(sinon.match({
        index: 'events.idx',
        type: 'events',
        from: advancedQuery.offset,
        size: advancedQuery.limit,
        body: {
          sort: defaultSort
        }
      }));
    });

    it('should call elasticsearch.searchDocuments with correct calendars option', function() {
      deps.elasticsearch.searchDocuments = sinon.spy();

      const module = require('../../../../backend/lib/search')(dependencies);

      module.searchEventsAdvanced(advancedQuery);

      expect(deps.elasticsearch.searchDocuments).to.have.been.calledWith(sinon.match(parameters => {
        expect(parameters.body.query.bool.filter).to.contain({
          terms: {
            calendarId: advancedQuery.calendars.map(calendar => calendar.calendarId)
          }
        });

        return true;
      }));
    });

    it('should call elasticsearch.searchDocuments with correct parameters including organizers option', function() {
      deps.elasticsearch.searchDocuments = sinon.spy();

      const module = require('../../../../backend/lib/search')(dependencies);

      advancedQuery.organizers = ['user1997@open-paas.org', 'user0@open-paas.org'];

      module.searchEventsAdvanced(advancedQuery);

      expect(deps.elasticsearch.searchDocuments).to.have.been.calledWith(sinon.match(parameters => {
        expect(parameters.body.query.bool.filter).to.contain(
          {
            terms: {
              'organizer.email.full': advancedQuery.organizers
            }
          }
        );

        return true;
      }));
    });

    it('should call elasticsearch.searchDocuments with correct parameters including attendees option', function() {
      deps.elasticsearch.searchDocuments = sinon.spy();

      const module = require('../../../../backend/lib/search')(dependencies);

      advancedQuery.attendees = ['user1@open-paas.org', 'user2@open-paas.org'];

      module.searchEventsAdvanced(advancedQuery);

      expect(deps.elasticsearch.searchDocuments).to.have.been.calledWith(sinon.match(parameters => {
        expect(parameters.body.query.bool.must).to.include(
          {
            terms: {
              'attendees.email.full': advancedQuery.attendees
            }
          }
        );

        return true;
      }));
    });

    it('should send back result when elasticsearch.searchDocuments is successful', function(done) {
      const total = 2;
      const hits = [{ _id: 1 }, { _id: 2 }];

      deps.elasticsearch.searchDocuments = function(options, callback) {
        return callback(null, {
          hits: {
            total,
            hits
          }
        });
      };

      const module = require('../../../../backend/lib/search')(dependencies);

      module.searchEventsAdvanced(advancedQuery).then(result => {
        expect(result.total_count).to.equal(total);
        expect(result.list).to.deep.equal(hits);
        done();
      }).catch(done);
    });

    it('should send back error when elasticsearch.searchDocuments fails', function(done) {
      deps.elasticsearch.searchDocuments = function(options, callback) {
        return callback(new Error());
      };

      const module = require('../../../../backend/lib/search')(dependencies);

      module.searchEventsAdvanced(advancedQuery)
        .then(() => done(new Error('should not occur')))
        .catch(err => {
          expect(err).to.exist;
          done();
        });
    });
  });
});
