const { expect } = require('chai');
const sinon = require('sinon');
const { EVENTS: { EVENT } } = require('../../../../backend/lib/constants');

describe('The event message module', function() {
  let getModule, localPubsub;
  let eventMessageMock, getSpy, localPublishSpy, triggerEvents;

  beforeEach(function() {
    localPublishSpy = sinon.spy();
    localPubsub = {
      topic: sinon.spy(() => ({
        publish: localPublishSpy
      }))
    };

    eventMessageMock = function() {
      return eventMessageMock;
    };

    triggerEvents = {};
    getSpy = sinon.spy(topic => ({
      receive: handler => {
        triggerEvents[topic] = handler;
      }
    }));

    this.moduleHelpers.addDep('pubsub', {
      local: localPubsub
    });
    this.moduleHelpers.addDep('messaging', {
      pointToPoint: {
        get: getSpy
      }
    });

    getModule = () => require('../../../../backend/lib/messaging')(this.moduleHelpers.dependencies);
  });

  it('should subscribe point to point message for CRUD calendar-event operations', function() {
    getModule().listen();

    expect(getSpy).to.have.been.callCount(6);
    expect(getSpy).to.have.been.calledWith(EVENT.CREATED);
    expect(getSpy).to.have.been.calledWith(EVENT.UPDATED);
    expect(getSpy).to.have.been.calledWith(EVENT.REQUEST);
    expect(getSpy).to.have.been.calledWith(EVENT.CANCEL);
    expect(getSpy).to.have.been.calledWith(EVENT.DELETED);
    expect(getSpy).to.have.been.calledWith(EVENT.REPLY);
  });

  it('should initialize the topic for local pubsub for calendar-event operation', function() {
    getModule();

    expect(localPubsub.topic).to.have.been.callCount(6);
    expect(localPubsub.topic).to.have.been.calledWith(EVENT.CREATED);
    expect(localPubsub.topic).to.have.been.calledWith(EVENT.UPDATED);
    expect(localPubsub.topic).to.have.been.calledWith(EVENT.REQUEST);
    expect(localPubsub.topic).to.have.been.calledWith(EVENT.REPLY);
    expect(localPubsub.topic).to.have.been.calledWith(EVENT.DELETED);
    expect(localPubsub.topic).to.have.been.calledWith(EVENT.CANCEL);
  });

  it('should pubsub local event if there is a point to point message is fired when an event is created', function() {
    getModule().listen();
    const message = { foo: 'bar' };

    triggerEvents[EVENT.CREATED](message);

    expect(localPublishSpy).to.have.been.calledWith(message);
  });

  it('should pubsub local event if there is a point to point message is fired when an event is updated', function() {
    getModule().listen();
    const message = { foo: 'bar' };

    triggerEvents[EVENT.UPDATED](message);

    expect(localPublishSpy).to.have.been.calledWith(message);
  });

  it('should pubsub local event if there is a point to point message is fired when an event is requested', function() {
    getModule().listen();
    const message = { foo: 'bar' };

    triggerEvents[EVENT.REQUEST](message);

    expect(localPublishSpy).to.have.been.calledWith(message);
  });

  it('should pubsub local event if there is a point to point message is fired when an event is replied', function() {
    getModule().listen();
    const message = { foo: 'bar' };

    triggerEvents[EVENT.REPLY](message);

    expect(localPublishSpy).to.have.been.calledWith(message);
  });

  it('should pubsub local event if there is a point to point message is fired when an event is deleted', function() {
    getModule().listen();
    const message = { foo: 'bar' };

    triggerEvents[EVENT.DELETED](message);

    expect(localPublishSpy).to.have.been.calledWith(message);
  });

  it('should pubsub local event if there is a point to point message is fired when an event is deleted', function() {
    getModule().listen();
    const message = { foo: 'bar' };

    triggerEvents[EVENT.CANCEL](message);

    expect(localPublishSpy).to.have.been.calledWith(message);
  });
});
