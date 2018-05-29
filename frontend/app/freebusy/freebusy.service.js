(function(angular) {
  'use strict';

  angular.module('esn.calendar').factory('calFreebusyService', calFreebusyService);

  function calFreebusyService(
    $log,
    $q,
    $rootScope,
    _,
    CalVfreebusyShell,
    calFreebusyAPI,
    calPathBuilder,
    calendarAPI,
    calendarService,
    calAttendeeService,
    calMoment,
    CAL_FREEBUSY,
    ICAL
  ) {

    return {
      listFreebusy: listFreebusy,
      isAttendeeAvailable: isAttendeeAvailable,
      areAttendeesAvailable: areAttendeesAvailable,
      getAttendeesAvailability: getAttendeesAvailability,
      setFreeBusyStatus: setFreeBusyStatus
    };

    function setFreeBusyStatus(attendee, start, end) {
      // attendee can have id equals to email when coming from autocomplete
      if (!attendee.id || attendee.id === attendee.email) {
        return calAttendeeService.getUserIdForAttendee(attendee)
          .then(function(id) {
            if (!id) {
              return setFreebusy(CAL_FREEBUSY.UNKNOWN);
            }

            attendee.id = id;

            return loadAndPatchAttendee(attendee, start, end);
          });
      }

      return loadAndPatchAttendee(attendee, start, end);

      function loadAndPatchAttendee(attendee, start, end) {
        setFreebusy(CAL_FREEBUSY.LOADING);

        return isAttendeeAvailable(attendee.id, start, end)
          .then(function(isAvailable) {
            setFreebusy(isAvailable ? CAL_FREEBUSY.FREE : CAL_FREEBUSY.BUSY);
          })
          .catch(function() {
            setFreebusy(CAL_FREEBUSY.UNKNOWN);
          });
      }

      function setFreebusy(freebusy) {
        attendee.freeBusy = freebusy;
      }
    }

    function listFreebusy(userId, start, end) {
      return calendarService.listFreeBusyCalendars(userId).then(function(cals) {
        var calPromises = cals.map(function(cal) {
          return calFreebusyAPI.report(calPathBuilder.forCalendarId(userId, cal.id), start, end);
        });

        return $q.all(calPromises)
          .then(function(freebusies) {
            return freebusies.map(function(freebusy) {
              var vcalendar = new ICAL.Component(freebusy);
              var vfreebusy = vcalendar.getFirstSubcomponent('vfreebusy');

              return new CalVfreebusyShell(vfreebusy);
            });
          });
      }).catch($q.reject);
    }

    /**
     * @name isAttendeeAvailable
     * @description For a given datetime period, determine if user is Free or Busy, for all is calendars
     * @param {string} attendeeId - Id of the attendee
     * @param {string} dateStart - Starting date of the requested period
     * @param {string} dateEnd - Ending date of the requested period
     * @return {boolean} true on free, false on busy
     */
    function isAttendeeAvailable(attendeeId, dateStart, dateEnd) {
      var start = calMoment(dateStart);
      var end = calMoment(dateEnd);

      return listFreebusy(attendeeId, start, end)
        .then(function(freeBusies) {
          return _.every(freeBusies, function(freeBusy) {
            return freeBusy.isAvailable(start, end);
          });
        })
        .catch($q.reject);
    }

    function areAttendeesAvailable(attendees, start, end) {
      return getAttendeesAvailability(attendees, start, end).then(function(result) {
        if (!result.users) {
          throw new Error('Can not retrieve attendees availability');
        }

        return !_
          .chain(result.users)
          .pluck('calendars')
          .flatten()
          .filter(function(v) { return !_.isEmpty(v.freebusy); })
          .value()
          .length;
      });
    }

    function getAttendeesAvailability(attendees, start, end) {
      return calAttendeeService.getUsersIdsForAttendees(attendees)
        .then(function(ids) {
          return ids.filter(Boolean);
        })
        .then(function(usersIds) {
          return calFreebusyAPI.getBulkFreebusyStatus(usersIds, start, end);
        });
    }
  }
})(angular);
