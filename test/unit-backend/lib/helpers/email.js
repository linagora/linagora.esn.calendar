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

    it('should return check.png for a timed event', function() {
      event.allDay = false;
      expect(this.module.filterEventAttachments(event)('check.png')).to.be.true;
    });

    it('should return check.png for a multi-allday event', function() {
      event.allDay = true;
      event.durationInDays = 2;
      expect(this.module.filterEventAttachments(event)('check.png')).to.be.true;
    });

    it('should not return check.png for an allday event that lasts for one day', function() {
      event.allDay = true;
      event.durationInDays = 1;
      expect(this.module.filterEventAttachments(event)('check.png')).to.be.false;
    });
  });
});
