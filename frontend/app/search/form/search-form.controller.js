(function(angular) {
  'use strict';

  angular.module('esn.calendar').controller('EventSearchFormController', EventSearchFormController);

  function EventSearchFormController(_, session, calendarService, userAndExternalCalendars, CAL_ADVANCED_SEARCH_CALENDAR_TYPES) {
    var self = this;

    self.$onInit = $onInit;
    self.onAddingUser = onAddingUser;

    function onAddingUser($tag) {
      return !!$tag._id;
    }

    function $onInit() {
      var defaultAdvancedQuery = {
        organizers: [],
        attendees: [],
        contains: self.query.text || '',
        cal: CAL_ADVANCED_SEARCH_CALENDAR_TYPES.ALL_CALENDARS
      };

      self.query.advanced = _.assign(defaultAdvancedQuery, self.query.advanced);

      _fetchCalendars();
    }

    function _fetchCalendars() {
      return calendarService.listPersonalAndAcceptedDelegationCalendars(session.user._id).then(function(calendars) {
        var categorizedCalendars = userAndExternalCalendars(calendars);

        self.calendars = {
          myCalendars: categorizedCalendars.userCalendars,
          sharedCalendars: (categorizedCalendars.publicCalendars || []).concat(categorizedCalendars.sharedCalendars || [])
        };
      });
    }
  }
})(angular);
