'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const mockery = require('mockery');

describe('The websocket subscription handler module', function() {

  describe('The notify function', function() {
    var userId, shareeId, topic;

    beforeEach(function() {
      userId = '123';
      shareeId = '456';
      topic = 'mytopic';
    });

    it('should call calendarHandler notify', function() {
      var message = {
        event: 'ICS',
        eventPath: `calendar/${userId}/events/1213.ics`,
        shareeIds: [
          `principals/users/${shareeId}`
        ]
      };
      var calendarMock = {
        notify: sinon.spy()
      };

      mockery.registerMock('./subscription', function() {
        return calendarMock;
      });

      var module = require(this.moduleHelpers.backendPath + '/ws/handlers/subscription')(this.moduleHelpers.dependencies);

      module.notify(topic, message);

      expect(calendarMock.notify).to.have.been.calledWith(topic, message);
    });
  });
});
