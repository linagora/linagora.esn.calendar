(function() {
  'use strict';

  angular.module('esn.calendar')
         .factory('RRuleShell', RRuleShellFactory);

  RRuleShellFactory.$inject = [
    'fcMoment',
    'ICAL',
    'RRULE_MODIFY_COMPARE_KEYS'
  ];

  function RRuleShellFactory(fcMoment, ICAL, RRULE_MODIFY_COMPARE_KEYS) {
    function RRuleShell(rrule, vevent) {
      this.rrule = rrule;
      this.vevent = vevent;
      this.updateParentEvent();
    }

    RRuleShell.prototype = {
      equals: equals,
      isValid: isValid,
      updateParentEvent: updateParentEvent,
      get freq() {
        return this.rrule ? this.rrule.freq : null;
      },
      set freq(value) {
        this.rrule.freq = value;
        this.updateParentEvent();
      },

      get interval() {
        if (!this.__interval && this.rrule && this.rrule.interval) {
          this.__interval = parseInt(this.rrule.interval, 10);
        } else {
          this.__interval = this.__interval || null;
        }

        return this.__interval;
      },
      set interval(value) {
        this.__interval = undefined;
        this.rrule.interval = angular.isNumber(value) ? [value] : null;
        this.updateParentEvent();
      },

      get until() {
        if (!this.rrule || !this.rrule.until) {
          return null;
        }
        this.__until = this.__until || fcMoment(this.rrule.until.toJSDate());

        return this.__until;
      },
      set until(value) {
        this.__until = undefined;
        this.rrule.until = value ? ICAL.Time.fromJSDate(value, true) : undefined;
        this.updateParentEvent();
      },

      get count() {
        if (!this.rrule || !this.rrule.count) {
          return null;
        }
        this.__count = this.__count || parseInt(this.rrule.count, 10);

        return this.__count;
      },
      set count(value) {
        this.__count = undefined;
        this.rrule.count = angular.isNumber(value) ? [value] : undefined;
        this.updateParentEvent();
      },

      get byday() {
        if (!this.__byday) {
          this.__byday = this.rrule && this.rrule.byday ? this.rrule.byday : [];
        }

        return this.__byday;
      },
      set byday(value) {
        this.__byday = undefined;
        this.rrule.byday = value;
        this.updateParentEvent();
      }
    };

    return RRuleShell;

    ////////////

    function equals(that) {
      if (!that) { return false; }
      if (that === this) { return true; }
      var self = this;

      return RRULE_MODIFY_COMPARE_KEYS.every(function(key) {
        return angular.equals(self[key], that[key]);
      });
    }

    function isValid() {
      return !!this.rrule.freq;
    }

    function updateParentEvent() {
      if (this.isValid()) {
        var intervalTmp = this.rrule.interval;

        this.rrule.interval = this.rrule.interval || [1];
        this.vevent.updatePropertyWithValue('rrule', new ICAL.Recur.fromData(this.rrule));
        this.rrule.interval = intervalTmp;
      } else {
        this.vevent.removeProperty('rrule');
      }
    }

  }

})();