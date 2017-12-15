const sinon = require('sinon');
const mockery = require('mockery');
const fs = require('fs');
const { expect } = require('chai');
const ICAL = require('@linagora/ical.js');

describe('The resource attendee module', function() {
  let technicalUserHelper, caldavClient, token;

  beforeEach(function() {
    this.calendarModulePath = this.moduleHelpers.modulePath;
    this.jcalHelper = require(this.moduleHelpers.backendPath + '/lib/helpers/jcal');

    token = {token: 'The token'};

    technicalUserHelper = {
      getTechnicalUserToken: sinon.stub()
    };

    caldavClient = {
      buildEventUrlFromEventPath: sinon.stub(),
      updateEvent: sinon.stub()
    };

    mockery.registerMock('../caldav-client', () => caldavClient);
    mockery.registerMock('../helpers/technical-user', () => technicalUserHelper);

    this.getModule = () => require(this.moduleHelpers.backendPath + '/lib/resource/attendee')(this.moduleHelpers.dependencies);
  });

  describe('The setParticipation function', function() {
    let ics, eventPath, etag, resource, participation, url;

    beforeEach(function() {
      ics = fs.readFileSync(this.calendarModulePath + '/test/unit-backend/fixtures/meeting-with-resource.ics').toString('utf8');
      participation = 'ACCEPTED';
      eventPath = '/resource/event.ics';
      url = `http://localhost:8001/dav${eventPath}`;
      etag = 1;
      resource = {
        _id: 'meetingroom',
        domain: {
          _id: 'domainId',
          name: 'open-paas.org'
        }
      };
    });

    it('should call caldavclient correctly', function(done) {
      const self = this;

      technicalUserHelper.getTechnicalUserToken.returns(Promise.resolve(token));
      caldavClient.buildEventUrlFromEventPath.returns(Promise.resolve(url));
      caldavClient.updateEvent.returns(Promise.resolve());

      const module = this.getModule();

      module.setParticipation({ics, eventPath, etag, resource, participation})
        .then(() => {
          expect(technicalUserHelper.getTechnicalUserToken).to.have.been.calledWith(resource.domain._id);
          expect(caldavClient.buildEventUrlFromEventPath).to.have.been.calledWith(eventPath);
          expect(caldavClient.updateEvent).to.have.been.calledWith({
            url,
            etag,
            ESNToken: token.token,
            json: sinon.match(function(json) {
              const vcalendar = new ICAL.Component(json);
              const vevent = vcalendar.getFirstSubcomponent('vevent');
              const attendee = self.jcalHelper.getVeventAttendeeByMail(vevent, 'meetingroom@open-paas.org');

              return attendee && attendee.getParameter('partstat') === participation;
            })
          });
          done();
        })
        .catch(done);
    });
  });
});
