(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalPartstatButtonsController', CalPartstatButtonsController);

  function CalPartstatButtonsController($attrs, calEventService, calEventUtils, session) {
    var self = this;

    self.$onInit = $onInit;
    self.isCurrentAttendeePartstat = isCurrentAttendeePartstat;
    self.changeParticipation = changeParticipation;

    function $onInit() {
      self.canSuggestChanges = calEventUtils.canSuggestChanges(self.event, session.user);
    }

    function changeParticipation(partstat) {
      if ($attrs.changePartstat) {
        self.changePartstat({partstat: partstat});
      } else {
        _changeParticipation(partstat);
      }
    }

    function _changeParticipation(partstat) {
      var attendee = calEventUtils.getUserAttendee(self.event);

      if (!attendee || attendee.partstat === partstat) {
        return;
      }

      calEventService.changeParticipation(self.event.path, self.event, [attendee.email], partstat, self.event.etag)
        .then(onSuccess, onError);

      function onSuccess(result) {
        self.onParticipationChangeSuccess && self.onParticipationChangeSuccess({event: result});
      }

      function onError(err) {
        self.onParticipationChangeFailure && self.onParticipationChangeFailure({err: err});
      }
    }

    function isCurrentAttendeePartstat(partstat) {
      return (calEventUtils.getUserAttendee(self.event) || {}).partstat === partstat;
    }
  }
})(angular);
