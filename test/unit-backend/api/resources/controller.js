const { expect } = require('chai');
const sinon = require('sinon');
const mockery = require('mockery');

describe('The resource controller', function() {
  let resourceId, eventId, attendeeStatus, vcalAsJSON, req, caldavClient, jsonEvent, etag, jcalHelper, ESNToken, loggerSpy, resource, user, getEventUrl, eventUrl, getResourceEmail, resourceEmail;

  beforeEach(function() {
    ESNToken = '123456789';
    user = {_id: 1};
    resourceId = 'resourceId';
    eventId = 'eventId';
    attendeeStatus = 'accepted';
    eventUrl = 'http://localhost:8080/calendar/api/calendars/1/2.ics';
    resourceEmail = 'resource@domain.com';
    resource = {
      _id: resourceId,
      administrators: [{ _id: 2 }]
    };
    req = {
      token: {
        token: ESNToken
      },
      params: {
        resourceId,
        eventId
      },
      query: {
        status: attendeeStatus
      },
      user,
      resource
    };
    etag = 'etag';
    vcalAsJSON = {foo: 'bar'};
    jsonEvent = { id: 'jsonEvent', toJSON: () => vcalAsJSON };
    jcalHelper = {
      updateParticipation: sinon.stub().returns(jsonEvent),
      icsAsVcalendar: sinon.stub().returns(jsonEvent)
    };
    getEventUrl = sinon.stub().returns(Promise.resolve(eventUrl));
    getResourceEmail = sinon.stub().returns(resourceEmail);
    caldavClient = {
      getEventFromUrl: sinon.stub().returns(Promise.resolve({ical: jsonEvent, etag })),
      updateEvent: sinon.stub().returns(Promise.resolve())
    };
    mockery.registerMock('../../../lib/caldav-client', () => caldavClient);
    mockery.registerMock('../../../lib/resource/utils', () => ({ getEventUrl }));
    mockery.registerMock('../../../lib/resource/helpers', { getResourceEmail });
    mockery.registerMock('../../../lib/helpers/jcal', jcalHelper);
    loggerSpy = sinon.spy(this.moduleHelpers.dependencies('logger'), 'error');

    this.loadModule = () => require(`${this.moduleHelpers.backendPath}/webserver/api/resources/controller`)(this.moduleHelpers.dependencies);
  });

  describe('The changeParticipation function', function() {
    it('should 500 when event url can not be retrieved', function(done) {
      const errorMsg = 'Can not get event url';

      getEventUrl.returns(Promise.reject(new Error(errorMsg)));

      this.loadModule().changeParticipation(req, {
        status: status => {
          expect(status).to.equal(500);

          return {
            json: json => {
              expect(loggerSpy.firstCall.args[1].message).to.equal(errorMsg);
              expect(getEventUrl).to.have.been.calledWith(resourceId, eventId);
              expect(json.error.details).to.match(/Error while updating event participation/);
              done();
            }
          };
        }
      });
    });

    it('should 500 when getEventFromUrl fails', function(done) {
      const errorMsg = 'I failed to get event';

      caldavClient.getEventFromUrl.returns(Promise.reject(new Error(errorMsg)));

      this.loadModule().changeParticipation(req, {
        status: status => {
          expect(status).to.equal(500);

          return {
            json: json => {
              expect(loggerSpy.firstCall.args[1].message).to.equal(errorMsg);
              expect(caldavClient.getEventFromUrl).to.have.been.calledWith({ url: eventUrl, ESNToken });
              expect(json.error.details).to.match(/Error while updating event participation/);
              done();
            }
          };
        }
      });
    });

    it('should 500 when participation can not be updated', function(done) {
      const errorMsg = 'Failed to update attendee';

      jcalHelper.updateParticipation.throws(new Error(errorMsg));

      this.loadModule().changeParticipation(req, {
        status: status => {
          expect(status).to.equal(500);

          return {
            json: json => {
              expect(loggerSpy.firstCall.args[1].message).to.equal(errorMsg);
              expect(jcalHelper.updateParticipation).to.have.been.calledWith(jsonEvent, resourceEmail, attendeeStatus);
              expect(json.error.details).to.match(/Error while updating event participation/);
              done();
            }
          };
        }
      });
    });

    it('should 500 when updateEvent fails', function(done) {
      const errorMsg = 'Failed to update event';

      caldavClient.updateEvent.returns(Promise.reject(new Error(errorMsg)));

      this.loadModule().changeParticipation(req, {
        status: status => {
          expect(status).to.equal(500);

          return {
            json: _json => {
              expect(loggerSpy.firstCall.args[1].message).to.equal(errorMsg);
              expect(caldavClient.updateEvent).to.have.been.calledWith({ url: eventUrl, etag, ESNToken, json: vcalAsJSON });
              expect(_json.error.details).to.match(/Error while updating event participation/);
              done();
            }
          };
        }
      });
    });

    it('should 200 when updated', function(done) {
      this.loadModule().changeParticipation(req, {
        status: status => {
          expect(status).to.equal(200);

          return {
            send: () => {
              done();
            }
          };
        }
      });
    });
  });
});
