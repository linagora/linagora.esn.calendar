const { expect } = require('chai');

describe('The url helper', function() {
  beforeEach(function() {
    this.calendarModulePath = this.moduleHelpers.modulePath;
    this.urlHelper = require(this.calendarModulePath + '/backend/lib/helpers/url');
  });

  describe('The isValidURL function', function() {
    it('should return true if the string is a valid absolute URL', function() {
      expect(this.urlHelper.isValidURL('http://123.com')).to.be.true;
    });

    it('should return true if the string is a valid relative URL', function() {
      expect(this.urlHelper.isValidURL('123.com')).to.be.true;
    });

    it('should return false if it is not a string', function() {
      expect(this.urlHelper.isValidURL(123)).to.be.false;
    });

    it('should return false if the string is empty', function() {
      expect(this.urlHelper.isValidURL('')).to.be.false;
    });

    it('should return false if the string is not a valid URL', function() {
      expect(this.urlHelper.isValidURL('/123')).to.be.false;
    });
  });

  describe('The isAbsoluteURL function', function() {
    it('should return true if the url is an absolute URL', function() {
      expect(this.urlHelper.isAbsoluteURL('http://123.com')).to.be.true;
    });

    it('should return false if the url is a relative URL', function() {
      expect(this.urlHelper.isAbsoluteURL('123.com')).to.be.false;
    });

    it('should return false if the url is invalid', function() {
      expect(this.urlHelper.isAbsoluteURL('someinvalid/string')).to.be.false;
    });

    it('should return false if the url is not a string', function() {
      expect(this.urlHelper.isAbsoluteURL(123)).to.be.false;
    });
  });
});
