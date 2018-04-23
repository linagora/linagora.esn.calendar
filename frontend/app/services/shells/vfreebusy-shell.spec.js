'use strict';

/* global chai, __FIXTURES__: false */

var expect = chai.expect;

describe('CalVfreebusyShell factory', function() {
  var ICAL, CalVfreebusyShell, vfreebusy, myFreeBusyShell;

  beforeEach(function() {
    angular.mock.module('esn.calendar');
    angular.mock.inject(function(_ICAL_, _CalVfreebusyShell_) {
      ICAL = _ICAL_;
      CalVfreebusyShell = _CalVfreebusyShell_;
    });

    function getComponentFromFixture(string) {
      var path = 'frontend/app/fixtures/calendar/vfreebusy_test/' + string;

      return new ICAL.Component(JSON.parse(__FIXTURES__[path]));
    }

    vfreebusy = getComponentFromFixture('vfreebusy.json');
    myFreeBusyShell = new CalVfreebusyShell(vfreebusy);
  });

  describe('The isAvailable function', function() {
    it('should be true on empty parameters', function() {
      expect(myFreeBusyShell.isAvailable()).to.be.true;
    });

    it('should be true when datetime given is during free day time', function() {
      expect(myFreeBusyShell.isAvailable('2018-03-01T00:00:00Z')).to.be.true;
    });

    it('should be true when datetime given is during free day & hour time', function() {
      expect(myFreeBusyShell.isAvailable('2018-03-04T09:00:00Z')).to.be.true;
    });

    it('should be false when datetime given is during busy day & hour time', function() {
      expect(myFreeBusyShell.isAvailable('2018-03-04T10:30:00Z')).to.be.false;
    });
  });
});
