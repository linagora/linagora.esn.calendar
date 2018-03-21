const {expect} = require('chai');

describe('The email helper', function() {
  describe('The filterEventAttachments function', function() {
    let organizer, event;

    beforeEach(function() {
      organizer = 'johndoe@open-paas.org';
      event = {organizer};
      this.module = require(this.moduleHelpers.backendPath + '/lib/helpers/email');
    });

    it('should return a function', function() {
      expect(this.module.filterEventAttachments()).to.be.a.function;
    });

    it('should return map-marker.png when location is specified', function() {
      event.location = 'Montpellier, FR';
      expect(this.module.filterEventAttachments(event)('map-marker.png')).to.be.true;
    });

    it('should not return map-marker.png when location is not specified', function() {
      expect(this.module.filterEventAttachments(event)('map-marker.png')).to.be.false;
    });

    it('should return format-align-justify.png when description is specified', function() {
      event.description = 'Lets do a BBQ!';
      expect(this.module.filterEventAttachments(event)('format-align-justify.png')).to.be.true;
    });

    it('should not return format-align-justify.png when description is not specified', function() {
      expect(this.module.filterEventAttachments(event)('format-align-justify.png')).to.be.false;
    });

    it('should return folder-download.png when files is specified', function() {
      event.files = 'montpellier.pdf';
      expect(this.module.filterEventAttachments(event)('folder-download.png')).to.be.true;
    });

    it('should not return folder-download.png when files is not specified', function() {
      expect(this.module.filterEventAttachments(event)('folder-download.png')).to.be.false;
    });

    it('should return to.png for a timed event', function() {
      event.allDay = false;
      expect(this.module.filterEventAttachments(event)('to.png')).to.be.true;
    });

    it('should return to.png for a multi-allday event', function() {
      event.allDay = true;
      event.durationInDays = 2;
      expect(this.module.filterEventAttachments(event)('to.png')).to.be.true;
    });

    it('should not return to.png for an allday event that lasts for one day', function() {
      event.allDay = true;
      event.durationInDays = 1;
      expect(this.module.filterEventAttachments(event)('to.png')).to.be.false;
    });

    it('should return comment-text.png when comment is specified', function() {
      event.comment = 'I love BBQ <3!';
      expect(this.module.filterEventAttachments(event)('comment-text.png')).to.be.true;
    });

    it('should not return comment-text.png when comment is not specified', function() {
      expect(this.module.filterEventAttachments(event)('comment-text.png')).to.be.false;
    });

    it('should return false for resource.png when event does not have resource', function() {
      event.hasResources = false;
      expect(this.module.filterEventAttachments(event)('resource.png')).to.be.false;
    });

    it('should return true for resource.png when event does have resource', function() {
      event.hasResources = true;
      expect(this.module.filterEventAttachments(event)('resource.png')).to.be.true;
    });

    it('should return true for to.png when event is all day', function() {
      event.hasResources = true;
      expect(this.module.filterEventAttachments(event)('resource.png')).to.be.true;
    });
  });
});
