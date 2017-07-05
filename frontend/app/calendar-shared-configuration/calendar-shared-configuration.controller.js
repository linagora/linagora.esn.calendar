(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalCalendarSharedConfigurationController', CalCalendarSharedConfigurationController);

  function CalCalendarSharedConfigurationController($log, $q, $state, _, session, notificationFactory, userUtils, uuid4, calendarService, calendarHomeService, CalendarCollectionShell, userAndExternalCalendars) {
    var self = this;
    var noResponseDelegationCalendars;

    self.calendarsPerUser = [];
    self.users = [];
    self.getSelectedCalendars = getSelectedCalendars;
    self.onUserAdded = onUserAdded;
    self.onUserRemoved = onUserRemoved;
    self.addSharedCalendars = addSharedCalendars;
    self.sessionUser = session.user;

    $onInit();

    //////////////////////

    function $onInit() {
      getNoResponseDelegationCalendarsForUser(session.user).then(function(noResponseDelegationCalendarsForUser) {
        noResponseDelegationCalendars = new NoResponseDelegationCalendars(noResponseDelegationCalendarsForUser);
      });
    }

    function NoResponseDelegationCalendars(noResponseDelegationCalendars) {
      this._noResponseDelegationCalendars = noResponseDelegationCalendars;
    }

    NoResponseDelegationCalendars.prototype.getCalendarsForUser = function(user) {
      return this._noResponseDelegationCalendars.filter(function(noResponseDelegationCalendar) {
        return noResponseDelegationCalendar.user._id === user._id;
      });
    };

    function filterSubscribedCalendars(userCalendars) {
      return getSubscribedCalendarsForCurrentUser().then(function(subscribedCalendars) {
        var sources = subscribedCalendars.map(function(calendar) {
          return calendar.source.href;
        });

        return _.filter(userCalendars, function(userCalendar) {
          return !_.contains(sources, userCalendar.calendar.href);
        });
      });
    }

    function getSubscribedCalendarsForCurrentUser() {
      return calendarHomeService.getUserCalendarHomeId()
        .then(calendarService.listCalendars)
        .then(function(calendars) {
          return userAndExternalCalendars(calendars).publicCalendars || [];
        });
    }

    function getPublicCalendarsForUser(user) {
      return calendarService.listPublicCalendars(user._id).then(function(calendars) {
          return calendars.map(function(calendar) {
            return {
              user: user,
              calendar: calendar,
              type: 'public'
            };
          });
        });
    }

    function getNoResponseDelegationCalendarsForUser(user) {
      return calendarService.listDelegationCalendars(user._id, 'noresponse')
        .then(function(delegationCalendars) {
          return delegationCalendars.map(function(delegationCalendar) {
            return {
              calendar: delegationCalendar,
              type: 'delegation'
            };
          });
        })
        .then(function(delegationCalendarsWrappers) {
          delegationCalendarsWrappers.forEach(function(delegationCalendarsWrapper, index) {
            delegationCalendarsWrapper.calendar.getOwner().then(function(owner) {
              delegationCalendarsWrapper.user = owner;
              delegationCalendarsWrapper.user.displayName = userUtils.displayNameOf(owner);
            });
          });

          return delegationCalendarsWrappers;
        });
    }

    function onUserAdded(user) {
      if (!user) {
        return;
      }

      getPublicCalendarsForUser(user)
        .then(filterSubscribedCalendars)
        .then(function(userCalendars) {
          self.calendarsPerUser = self.calendarsPerUser.concat(userCalendars);
        })
        .then(function() {
          self.calendarsPerUser = self.calendarsPerUser.concat(noResponseDelegationCalendars.getCalendarsForUser(user));
        })
        .catch(function(err) {
          $log.error('Can not get shared calendars for user', user._id, err);
        });
    }

    function onUserRemoved(user) {
      if (!user) {
        return;
      }

      _.remove(self.calendarsPerUser, function(calendarPerUser) {
        return calendarPerUser.user._id === user._id;
      });
    }

    function subscribe(calendars) {
      return calendarHomeService.getUserCalendarHomeId().then(function(calendarHomeId) {
        return $q.all(calendars.map(function(calendar) {
          var id = uuid4.generate();
          var subscription = CalendarCollectionShell.from({
            color: calendar.color,
            description: calendar.description,
            href: CalendarCollectionShell.buildHref(calendarHomeId, id),
            id: id,
            name: calendar.name,
            source: CalendarCollectionShell.from(calendar)
          });

          return calendarService.subscribe(calendarHomeId, subscription);
        }));
      });
    }

    function acceptInvitation() {
      // this must be modified by the real service
      return $q.when('yolo');
    }

    function subscribeToSelectedCalendars() {
      var selectedCalendars = getSelectedCalendars(_getPublicCalendars(self.calendarsPerUser));

      return selectedCalendars.length && subscribe(selectedCalendars);
    }

    function acceptInvitationToSelectedCalendars() {
      var selectedCalendars = getSelectedCalendars(_getDelegationCalendars(self.calendarsPerUser));

      return selectedCalendars.length && acceptInvitation(selectedCalendars);
    }

    function getSelectedCalendars(calendars) {
      return _(calendars)
        .filter('isSelected')
        .map(function(selected) {
          return selected.calendar;
        })
        .value();
    }

    function _getPublicCalendars(userCalendars) {
      return _.filter(userCalendars, { type: 'public' });
    }

    function _getDelegationCalendars(userCalendars) {
      return _.filter(userCalendars, { type: 'delegation' });
    }

    function addSharedCalendars() {
      $q.all([
        subscribeToSelectedCalendars(),
        acceptInvitationToSelectedCalendars()
      ])
      .then(function() {
        notificationFactory.weakInfo('Shared calendars', 'Successfully add shared calendar' + (getSelectedCalendars(self.calendarsPerUser).length ? 's' : ''));
      }, function() {
        notificationFactory.weakError('Shared calendars', 'Can not add shared calendar' + (getSelectedCalendars(self.calendarsPerUser).length ? 's' : ''));
      });
    }
  }
})();
