const { expect } = require('chai');
const sinon = require('sinon');
const { ObjectId } = require('bson');
const { NOTIFICATIONS } = require('../../../../backend/lib/constants');

describe('The calendar Elasticsearch actions', function() {
  let deps, dependencies, pubsubDep, elasticsearchDep, loggerDep;
  let topicMock, publishStubs;
  let elasticsearchActions;

  beforeEach(function() {
    elasticsearchDep = {};

    loggerDep = {
      error: () => {},
      debug: () => {},
      info: () => {},
      warning: () => {}
    };

    publishStubs = {
      [NOTIFICATIONS.EVENT_ADDED]: sinon.stub().returnsArg(0),
      [NOTIFICATIONS.EVENT_UPDATED]: sinon.stub().returnsArg(0),
      [NOTIFICATIONS.EVENT_DELETED]: sinon.stub().returnsArg(0)
    };

    topicMock = topic => ({ publish: publishStubs[topic] });
    pubsubDep = {
      local: {
        topic: topicMock
      }
    };

    deps = {
      elasticsearch: elasticsearchDep,
      logger: loggerDep,
      pubsub: pubsubDep
    };

    dependencies = name => deps[name];

    elasticsearchActions = require('../../../../backend/lib/search/actions')(dependencies);
  });

  describe('The searchEventsBasic function', function() {
    beforeEach(function() {
      deps.elasticsearch.searchDocuments = sinon.stub();
    });

    it('should call elasticsearch.searchDocuments with right parameters using default parameters for unset ones', function() {
      const query = {
        search: 'Bruce',
        offset: 10,
        limit: 100,
        userId: new ObjectId().toString(),
        calendarId: new ObjectId().toString()
      };

      const searchConstants = require('../../../../backend/lib/constants').SEARCH;
      const defaultSort = {};

      defaultSort[searchConstants.DEFAULT_SORT_KEY] = { order: searchConstants.DEFAULT_SORT_ORDER };

      elasticsearchActions.searchEventsBasic(query);
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

      const searchConstants = require('../../../../backend/lib/constants').SEARCH;
      const defaultSort = {};

      defaultSort[searchConstants.DEFAULT_SORT_KEY] = { order: searchConstants.DEFAULT_SORT_ORDER };

      elasticsearchActions.searchEventsBasic(query);
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

      elasticsearchActions.searchEventsBasic(query);
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

      elasticsearchActions.searchEventsBasic(query, this.helpers.callbacks.error(done));
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

      elasticsearchActions.searchEventsBasic(query, function(err, result) {
        expect(err).to.not.exist;
        expect(result.total_count).to.equal(total);
        expect(result.list).to.deep.equal(hits);
        done();
      });
    });
  });

  describe('The searchNextEvent function', function() {
    it('should call elasticsearch.searchDocuments with right parameters', function() {
      deps.elasticsearch.searchDocuments = sinon.stub();

      elasticsearchActions.searchNextEvent({ id: 'userId' });

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

  describe('The searchEvents function', function() {
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

      deps.elasticsearch.searchDocuments = sinon.stub();
    });

    it('should call elasticsearch.searchDocuments with correct basic parameters', function() {
      const searchConstants = require('../../../../backend/lib/constants').SEARCH;
      const defaultSort = {};

      defaultSort[searchConstants.DEFAULT_SORT_KEY] = { order: searchConstants.DEFAULT_SORT_ORDER };

      elasticsearchActions.searchEvents(advancedQuery);

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
      elasticsearchActions.searchEvents(advancedQuery);

      expect(deps.elasticsearch.searchDocuments).to.have.been.calledWith(sinon.match(parameters => {
        expect(parameters.body.query.bool.filter).to.contain({
          bool: {
            should: [
              { bool: { filter: [{ term: { calendarId: 'userId1' } }, { term: { userId: 'userId1' } }] } },
              { bool: { filter: [{ term: { calendarId: 'calId1' } }, { term: { userId: 'userId1' } }] } },
              { bool: { filter: [{ term: { calendarId: 'calId2' } }, { term: { userId: 'userId2' } }] } }
            ]
          }
        });

        return true;
      }));
    });

    it('should call elasticsearch.searchDocuments with correct parameters including organizers option', function() {
      advancedQuery.organizers = ['user1997@open-paas.org', 'user0@open-paas.org'];

      elasticsearchActions.searchEvents(advancedQuery);

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
      advancedQuery.attendees = ['user1@open-paas.org', 'user2@open-paas.org'];

      elasticsearchActions.searchEvents(advancedQuery);

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

      elasticsearchActions.searchEvents(advancedQuery).then(result => {
        expect(result.total_count).to.equal(total);
        expect(result.list).to.deep.equal(hits);
        done();
      }).catch(done);
    });

    it('should send back error when elasticsearch.searchDocuments fails', function(done) {
      deps.elasticsearch.searchDocuments = function(options, callback) {
        return callback(new Error());
      };

      elasticsearchActions.searchEvents(advancedQuery)
        .then(() => done(new Error('should not occur')))
        .catch(err => {
          expect(err).to.exist;
          done();
        });
    });
  });

  describe('The removeEventsFromIndex function', function() {
    it('should resolve when it has succeeded in deleting the events', function(done) {
      const eventUid = 'eventUid1';
      const userId = 'userId1';
      const calendarId = 'calendarId1';

      deps.elasticsearch.removeDocumentsByQuery = sinon.spy(function(query, callback) {
        expect(query).to.deep.equal({
          index: 'events.idx',
          type: 'events',
          body: {
            query: {
              bool: {
                filter: [
                  { term: { uid: eventUid } },
                  { term: { userId } },
                  { term: { calendarId } }
                ]
              }
            }
          }
        });

        callback();
      });

      elasticsearchActions.removeEventsFromIndex({ eventUid, userId, calendarId })
        .then(() => {
          expect(deps.elasticsearch.removeDocumentsByQuery).to.have.been.calledOnce;
          done();
        })
        .catch(err => done(err || new Error('should not happen')));
    });

    it('should reject when there is an error while searching and not publish EVENT_DELETED within local pubsub', function(done) {
      const eventUid = 'eventUid1';
      const userId = 'userId1';
      const calendarId = 'calendarId1';

      deps.elasticsearch.removeDocumentsByQuery = sinon.spy(function(query, callback) {
        expect(query).to.deep.equal({
          index: 'events.idx',
          type: 'events',
          body: {
            query: {
              bool: {
                filter: [
                  { term: { uid: eventUid } },
                  { term: { userId } },
                  { term: { calendarId } }
                ]
              }
            }
          }
        });

        callback(new Error('Error while searching'));
      });

      elasticsearchActions.removeEventsFromIndex({ eventUid, userId, calendarId })
        .then(() => done(new Error('should not happen')))
        .catch(err => {
          expect(deps.elasticsearch.removeDocumentsByQuery).to.have.been.calledOnce;
          expect(err).to.exist;
          done();
        });
    });
  });

  describe('The Pubsub functions', function() {
    const message = { test: 'whatever message' };

    function testLocalPublishOnEvent(localTopic, message, shouldNotBeCalled) {
      if (shouldNotBeCalled) {
        expect(publishStubs[localTopic]).to.have.not.been.called;

        return;
      }

      expect(publishStubs[localTopic]).to.have.been.calledWith(sinon.match(message));
    }

    describe('The addEventToIndexThroughPubsub function', function() {
      it('should publish EVENT_ADDED within local pubsub', function() {
        elasticsearchActions.addEventToIndexThroughPubsub(message);

        testLocalPublishOnEvent(NOTIFICATIONS.EVENT_ADDED, message);
      });
    });

    describe('The addSpecialOccursToIndexIfAnyThroughPubsub function', function() {
      it('should not publish EVENT_ADDED when receiving invalid recurrenceIds', function() {
        const recurrenceIds = {};

        elasticsearchActions.addSpecialOccursToIndexIfAnyThroughPubsub(recurrenceIds, message);

        testLocalPublishOnEvent(NOTIFICATIONS.EVENT_ADDED, message, true);
      });

      it('should not publish EVENT_ADDED when receiving empty recurrenceIds', function() {
        const recurrenceIds = [];

        elasticsearchActions.addSpecialOccursToIndexIfAnyThroughPubsub(recurrenceIds, message);

        testLocalPublishOnEvent(NOTIFICATIONS.EVENT_ADDED, message, true);
      });

      it('should publish EVENT_ADDED within local pubsub for each special occur', function() {
        const recurrenceIds = ['recurId1', 'recurId2'];

        elasticsearchActions.addSpecialOccursToIndexIfAnyThroughPubsub(recurrenceIds, message);

        recurrenceIds.forEach((recurrenceId, index) => {
          expect(publishStubs[NOTIFICATIONS.EVENT_ADDED].getCall(index).calledWith(sinon.match({ ...message, recurrenceId }))).to.be.true;
        });
      });
    });

    describe('The updateEventInIndexThroughPubsub function', function() {
      it('should publish EVENT_UPDATED within local pubsub', function() {
        elasticsearchActions.updateEventInIndexThroughPubsub(message);

        testLocalPublishOnEvent(NOTIFICATIONS.EVENT_UPDATED, message);
      });
    });

    describe('The removeEventFromIndexThroughPubsub function', function() {
      it('should publish EVENT_DELETED within local pubsub', function() {
        elasticsearchActions.removeEventFromIndexThroughPubsub(message);

        testLocalPublishOnEvent(NOTIFICATIONS.EVENT_DELETED, message);
      });
    });
  });
});
