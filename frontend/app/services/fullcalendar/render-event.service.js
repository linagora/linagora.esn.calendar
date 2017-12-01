(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .factory('calFullCalendarRenderEventService', calFullCalendarRenderEventService);

  function calFullCalendarRenderEventService(
    escapeHtmlUtils,
    matchmedia,
    session,
    calEventUtils,
    calUIAuthorizationService,
    ESN_MEDIA_QUERY_SM_XS,
    CAL_MAX_DURATION_OF_SMALL_EVENT
  ) {
    return function(calendar) {
      return function(event, element, view) {
        var timeDiv = element.find('.fc-time');
        var title = element.find('.fc-title');
        var eventDurationInMinute = event.end.diff(event.start, 'minutes');
        var userAsAttendee = calEventUtils.getUserAttendee(event);
        var eventTitle = calEventUtils.getEventTitle(event);
        var eventIconsDivInMobile;

        fixTitleDiv();
        setEventTitle();
        addTooltipToEvent();
        changeEventColorWhenMonthView();
        adaptTitleWhenShortEvent();
        appendLocation();
        appendDescription();
        setEventRights();
        addIcons();
        switchTitleAndTime();

        function fixTitleDiv() {
          // if event does not have title, FC does not add div, so we need to...
          var contentDiv = element.find('.fc-content');

          if (!title.length) {
            contentDiv.prepend('<div class="fc-title"></div>');
            title = element.find('.fc-title');
          }
        }

        function setEventTitle() {
          title.text(calEventUtils.getEventTitle(event));
        }

        function switchTitleAndTime() {
          if (view.name === 'month') {
            return;
          }

          if (element.find('.fc-time').length) {
            // needs to be checked with find because element is potentially removed for all day events and 30 minutes ones
            timeDiv.before(title.remove());
          }
        }

        function addTooltipToEvent() {
          element.find('.fc-content').attr('title', eventTitle);
        }

        function changeEventColorWhenMonthView() {
          if ((view.name === 'month') && !event.allDay && event.isOverOneDayOnly()) {
            var eventColor = element.css('background-color');

            element.css('color', eventColor);
            element.css('border', '0');
            timeDiv.css('background-color', 'transparent');
            element.css('background-color', 'transparent');
          }
        }

        function adaptTitleWhenShortEvent() {
          if ((eventDurationInMinute <= CAL_MAX_DURATION_OF_SMALL_EVENT.DESKTOP) && element.find('.fc-time').length && element.find('.fc-title').length) {
            timeDiv.remove();
            title.text(event.start.format('hh:mm') + ' - ' + eventTitle);
          }
        }

        function appendLocation() {
          if (event.location) {
            element.addClass('event-with-location');
            timeDiv.append(angular.element('<div class="fc-location">' + escapeHtmlUtils.escapeHTML(event.location) + '</div>'));
          }
        }

        function appendDescription() {
          if (event.description) {
            element.attr('title', escapeHtmlUtils.escapeHTML(event.description));
          }
        }

        function setEventRights() {
          if (!calUIAuthorizationService.canModifyEvent(calendar, event, session.user._id)) {
            event.startEditable = false;
            event.durationEditable = false;
          }
        }

        function addIcons() {
          if (matchmedia.is(ESN_MEDIA_QUERY_SM_XS)) {
            title.append(angular.element('<div class="event-icons-mobile"></div>'));
            eventIconsDivInMobile = title.find('.event-icons-mobile');

            addIconInEventInstanceInMobile();

            addIconForAttendeesInMobile();

            addIconInPrivateEventInMobile();
          } else {
            addIconInEventInstanceInDesktop();

            addIconForAttendeesInDesktop();

            addIconInPrivateEventInDesktop();
          }
        }

        function addIconInPrivateEventInMobile() {
          if (event.isPrivate()) {
            var smallEvent = eventDurationInMinute <= CAL_MAX_DURATION_OF_SMALL_EVENT.MOBILE;

            if (event.allDay || (!event.allDay && smallEvent)) {
              title.prepend('<i class="mdi mdi-lock"/>');
            } else if (!smallEvent) {
              eventIconsDivInMobile.append('<i class="mdi mdi-lock"/>');
            }
          }
        }

        function addIconInPrivateEventInDesktop() {
          if (event.isPrivate()) {
            if (event.allDay) {
              title.prepend('<i class="mdi mdi-lock"/>');
            } else {
              timeDiv.prepend('<i class="mdi mdi-lock"/>');
            }
          }
        }

        function addIconInEventInstanceInMobile() {
          if (event.isInstance()) {
            element.addClass('event-is-instance');

            if (event.allDay) {
              title.prepend('<i class="mdi mdi-sync"/>');
            } else {
              eventDurationInMinute <= CAL_MAX_DURATION_OF_SMALL_EVENT.MOBILE ? title.prepend('<i class="mdi mdi-sync"/>') : eventIconsDivInMobile.append('<i class="mdi mdi-sync"/>');
            }
          }
        }

        function addIconForAttendeesInMobile() {
          if (userAsAttendee) {
            if (userAsAttendee.partstat === 'NEEDS-ACTION') {
              element.addClass('event-needs-action');
            } else if (userAsAttendee.partstat === 'TENTATIVE') {
              element.addClass('event-tentative');

              if (event.allDay) {
                title.prepend('<i class="mdi mdi-help-circle"/>');
              } else {
                eventDurationInMinute <= CAL_MAX_DURATION_OF_SMALL_EVENT.MOBILE ? title.prepend('<i class="mdi mdi-help-circle"/>') : eventIconsDivInMobile.append('<i class="mdi mdi-help-circle"/>');
              }
            } else if (userAsAttendee.partstat === 'ACCEPTED') {
              element.addClass('event-accepted');
            } else if (userAsAttendee.partstat === 'DECLINED') {
              element.addClass('event-declined');
            }
          }
        }

        function addIconInEventInstanceInDesktop() {
          if (event.isInstance()) {
            element.addClass('event-is-instance');

            event.allDay ? title.prepend('<i class="mdi mdi-sync"/>') : timeDiv.prepend('<i class="mdi mdi-sync"/>');
          }
        }

        function addIconForAttendeesInDesktop() {
          if (userAsAttendee) {
            if (userAsAttendee.partstat === 'NEEDS-ACTION') {
              element.addClass('event-needs-action');
            } else if (userAsAttendee.partstat === 'TENTATIVE') {
              element.addClass('event-tentative');

              if (event.allDay) {
                title.prepend('<i class="mdi mdi-help-circle"/>');
              } else {
                timeDiv.prepend('<i class="mdi mdi-help-circle"/>');
              }
            } else if (userAsAttendee.partstat === 'ACCEPTED') {
              element.addClass('event-accepted');
            } else if (userAsAttendee.partstat === 'DECLINED') {
              element.addClass('event-declined');
            }
          }
        }
      };
    };
  }
})(angular);
