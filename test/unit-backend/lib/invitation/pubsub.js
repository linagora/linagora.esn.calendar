const { expect } = require('chai');
const mockery = require('mockery');
const fs = require('fs');
const sinon = require('sinon');
const ICAL = require('@linagora/ical.js');
const CONSTANTS = require('../../../../backend/lib/constants');

describe('The event invitation pubsub module', function() {
  let notifyFunctions;
  let pointToPointMock, loggerMock, emailModuleMock;

  beforeEach(function() {
    this.calendarModulePath = this.moduleHelpers.modulePath;
    notifyFunctions = {};

    pointToPointMock = {
      get: sinon.spy(topic => {
        pointToPointMock.currentTopic = topic;

        return pointToPointMock;
      }),
      receive: sinon.spy(notifyFn => {
        notifyFunctions[pointToPointMock.currentTopic] = notifyFn;
      })
    };

    loggerMock = {
      error: sinon.stub(),
      info: sinon.stub()
    };

    emailModuleMock = {
      sendNotificationEmails: sinon.stub().returns(Promise.resolve())
    };

    this.moduleHelpers.addDep('messaging', {
      pointToPoint: pointToPointMock
    });
    this.moduleHelpers.addDep('logger', loggerMock);

    mockery.registerMock('./email', () => emailModuleMock);

    this.requireModule = () => require(this.calendarModulePath + '/backend/lib/invitation/pubsub')(this.moduleHelpers.dependencies);

    this.getICSAsString = name => fs.readFileSync(`${this.calendarModulePath}/test/unit-backend/fixtures/${name}.ics`).toString('utf8');
    this.getEventAsJSON = name => this.getEvent(name).toJSON();
    this.getEvent = name => ICAL.Component.fromString(this.getICSAsString(name));
  });

  describe('The init function', function() {
    it('should listen to the right topic', function() {
      const pubsubModule = this.requireModule();

      pubsubModule.init();

      expect(pointToPointMock.get).to.have.been.calledOnce;
      expect(pointToPointMock.get).to.have.been.calledWith(CONSTANTS.EVENTS.NOTIFICATION_EMAIL.SEND);
      expect(pointToPointMock.receive).to.have.been.calledOnce;
    });

    it('should be callable once', function(done) {
      const pubsubModule = this.requireModule();

      pubsubModule.init();
      pubsubModule.init();

      expect(loggerMock.error).to.have.been.calledWith('The event invitation pubsub has already been initialized');
      expect(pointToPointMock.get).to.have.been.calledOnce;
      expect(pointToPointMock.get).to.have.been.calledWith(CONSTANTS.EVENTS.NOTIFICATION_EMAIL.SEND);
      expect(pointToPointMock.receive).to.have.been.calledOnce;
      done();
    });
  });

  describe('On EVENTS.NOTIFICATION_EMAIL.SEND event', function() {
    let pubsubModule, msg;

    beforeEach(function() {
      pubsubModule = this.requireModule();
      pubsubModule.init();

      msg = {
        recipientEmail: 'user0@open-paas.org',
        senderEmail: 'admin@open-paas.org',
        notify: true,
        method: 'REQUEST',
        event: 'someEventIcs',
        oldEvent: 'someOldEventIcs',
        calendarURI: '/some/calendar/uri',
        isNewEvent: true
      };
    });

    it('should not send notification emails when there is the recipient email is missing', function() {
      delete msg.recipientEmail;

      notifyFunctions[CONSTANTS.EVENTS.NOTIFICATION_EMAIL.SEND](msg);

      expect(loggerMock.error).to.have.been.calledWith('Error when trying to send notification emails to the attendee. Reason: The recipient email is missing or invalid. ' +
        `Message: ${JSON.stringify(msg)}`
      );
      expect(emailModuleMock.sendNotificationEmails).to.have.not.been.called;
    });

    it('should not send notification emails when the recipient email is invalid', function() {
      msg.recipientEmail = 12313;

      notifyFunctions[CONSTANTS.EVENTS.NOTIFICATION_EMAIL.SEND](msg);

      expect(loggerMock.error).to.have.been.calledWith('Error when trying to send notification emails to the attendee. Reason: The recipient email is missing or invalid. ' +
        `Message: ${JSON.stringify(msg)}`
      );
      expect(emailModuleMock.sendNotificationEmails).to.have.not.been.called;
    });

    it('should not send notification emails when there is no method', function() {
      delete msg.method;

      notifyFunctions[CONSTANTS.EVENTS.NOTIFICATION_EMAIL.SEND](msg);

      expect(loggerMock.error).to.have.been.calledWith(`Error when trying to send notification emails to attendee: "${msg.recipientEmail}". Reason: Method is required and must be a string (REQUEST, REPLY, CANCEL, etc.). ` +
        `Message: ${JSON.stringify(msg)}`
      );
      expect(emailModuleMock.sendNotificationEmails).to.have.not.been.called;
    });

    it('should not send notification emails when the method is invalid', function() {
      msg.method = 123123123;

      notifyFunctions[CONSTANTS.EVENTS.NOTIFICATION_EMAIL.SEND](msg);

      expect(loggerMock.error).to.have.been.calledWith(`Error when trying to send notification emails to attendee: "${msg.recipientEmail}". Reason: Method is required and must be a string (REQUEST, REPLY, CANCEL, etc.). ` +
        `Message: ${JSON.stringify(msg)}`
      );
      expect(emailModuleMock.sendNotificationEmails).to.have.not.been.called;
    });

    it('should not send notification emails when there is no event', function() {
      delete msg.event;

      notifyFunctions[CONSTANTS.EVENTS.NOTIFICATION_EMAIL.SEND](msg);

      expect(loggerMock.error).to.have.been.calledWith(`Error when trying to send notification emails to attendee: "${msg.recipientEmail}". Reason: Event is required and must be a string (ICS format)
        Message: ${JSON.stringify(msg)}
      `);
      expect(emailModuleMock.sendNotificationEmails).to.have.not.been.called;
    });

    it('should not send notification emails when the event is invalid', function() {
      msg.event = 123123123;

      notifyFunctions[CONSTANTS.EVENTS.NOTIFICATION_EMAIL.SEND](msg);

      expect(loggerMock.error).to.have.been.calledWith(`Error when trying to send notification emails to attendee: "${msg.recipientEmail}". Reason: Event is required and must be a string (ICS format)
        Message: ${JSON.stringify(msg)}
      `);
      expect(emailModuleMock.sendNotificationEmails).to.have.not.been.called;
    });

    it('should not send notification emails when there is no calendar URI', function() {
      delete msg.calendarURI;

      notifyFunctions[CONSTANTS.EVENTS.NOTIFICATION_EMAIL.SEND](msg);

      expect(loggerMock.error).to.have.been.calledWith(`Error when trying to send notification emails to attendee: "${msg.recipientEmail}". Reason: Calendar Id is required and must be a string
        Message: ${JSON.stringify(msg)}
      `);
      expect(emailModuleMock.sendNotificationEmails).to.have.not.been.called;
    });

    it('should not send notification emails when the calendar URI is invalid', function() {
      msg.calendarURI = 123123123;

      notifyFunctions[CONSTANTS.EVENTS.NOTIFICATION_EMAIL.SEND](msg);

      expect(loggerMock.error).to.have.been.calledWith(`Error when trying to send notification emails to attendee: "${msg.recipientEmail}". Reason: Calendar Id is required and must be a string
        Message: ${JSON.stringify(msg)}
      `);
      expect(emailModuleMock.sendNotificationEmails).to.have.not.been.called;
    });

    it('should not send notification emails when notify is false', function() {
      msg.notify = false;

      notifyFunctions[CONSTANTS.EVENTS.NOTIFICATION_EMAIL.SEND](msg);

      expect(loggerMock.error).to.have.not.been.called;
      expect(emailModuleMock.sendNotificationEmails).to.have.not.been.called;
    });

    it('should send notification emails and then resolve when the message is valid and notify is true', function(done) {
      msg.changes = { some: 'changes' };

      notifyFunctions[CONSTANTS.EVENTS.NOTIFICATION_EMAIL.SEND](msg)
        .then(() => {
          expect(loggerMock.error).to.have.not.been.called;
          expect(emailModuleMock.sendNotificationEmails).to.have.been.calledWith({
            senderEmail: msg.senderEmail,
            recipientEmail: msg.recipientEmail,
            method: msg.method,
            ics: msg.event,
            oldIcs: msg.oldEvent,
            calendarURI: msg.calendarURI,
            isNewEvent: msg.isNewEvent,
            changes: msg.changes
          });
          expect(loggerMock.info).to.have.been.calledWith(`Successfully sent notification emails to attendee: "${msg.recipientEmail}". Message: ${JSON.stringify(msg)}`);
          done();
        })
        .catch(err => done(err || new Error('should resolve')));
    });

    it('should reject when it fails to send notification emails', function(done) {
      const error = new Error('Error while sending emails');

      emailModuleMock.sendNotificationEmails = sinon.stub().returns(Promise.reject(error));

      notifyFunctions[CONSTANTS.EVENTS.NOTIFICATION_EMAIL.SEND](msg)
        .then(() => {
          expect(loggerMock.info).to.have.not.been.called;
          expect(emailModuleMock.sendNotificationEmails).to.have.been.calledWith({
            senderEmail: msg.senderEmail,
            recipientEmail: msg.recipientEmail,
            method: msg.method,
            ics: msg.event,
            oldIcs: msg.oldEvent,
            calendarURI: msg.calendarURI,
            isNewEvent: msg.isNewEvent,
            changes: undefined
          });
          expect(loggerMock.error).to.have.been.calledWith(`Error when trying to send notification emails to attendee: "${msg.recipientEmail}". Error: ${error.message}. Message: ${JSON.stringify(msg)}`);
          done();
        })
        .catch(err => done(err || new Error('should resolve')));
    });
  });
});
