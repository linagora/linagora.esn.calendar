(function() {
  'use strict';

  angular.module('esn.calendar')
    .factory('calendarAPI', calendarAPI);

  var JSON_CONTENT_TYPE_HEADER = { 'Content-Type': 'application/json' };

  function calendarAPI(
    $q,
    calendarRestangular,
    calPathBuilder,
    calDavRequest,
    calHttpResponseHandler,
    calGracePeriodResponseHandler,
    notificationFactory,
    _,
    CAL_ACCEPT_HEADER,
    CAL_DAV_DATE_FORMAT,
    CALENDAR_PREFER_HEADER,
    CALENDAR_CONTENT_TYPE_HEADER,
    CAL_GRACE_DELAY
  ) {

    return {
      create: create,
      modify: modify,
      remove: remove,
      listEvents: listEvents,
      searchEvents: searchEvents,
      getEventByUID: getEventByUID,
      listCalendars: listCalendars,
      getCalendar: getCalendar,
      listEventsForCalendar: listEventsForCalendar,
      listAllCalendars: listAllCalendars,
      createCalendar: createCalendar,
      removeCalendar: removeCalendar,
      getRight: getRight,
      modifyCalendar: modifyCalendar,
      modifyShares: modifyShares,
      changeParticipation: changeParticipation,
      modifyPublicRights: modifyPublicRights
    };

    ////////////

    function davResponseHandler(key) {
      return calHttpResponseHandler([200], function(response) {
        return (response.data && response.data._embedded && response.data._embedded[key]) || [];
      });
    }

    /**
     * Query one or more calendars for events in a specific range. The dav:calendar resources will include their dav:item resources.
     * @param  {String}   calendarHref The href of the calendar.
     * @param  {calMoment} start        calMoment type of Date, specifying the start of the range.
     * @param  {calMoment} end          calMoment type of Date, specifying the end of the range.
     * @return {Object}                An array of dav:items items.
     */
    function listEvents(calendarHref, start, end) {
      var body = {
        match: {
          start: start.format(CAL_DAV_DATE_FORMAT),
          end: end.format(CAL_DAV_DATE_FORMAT)
        }
      };

      return calDavRequest('report', calendarHref, JSON_CONTENT_TYPE_HEADER, body)
      .then(davResponseHandler('dav:item'));
    }

    /**
     * Query a calendar, searching for indexed events depending on the query. The dav:calendar resources will include their dav:item resources.
     * @method searchEvents
     * @param  {[type]} calendarId     The calendar id.
     * @param  {[type]} options        The query parameters {query: '', limit: 20, offset: 0}
     * @return {Object}                An array of dav:item items.
     */
    function searchEvents(calendarId, options) {
      var query = {
        query: options.query,
        limit: options.limit,
        offset: options.offset,
        sortKey: options.sortKey,
        sortOrder: options.sortOrder
      };

      return calendarRestangular.one(calendarId).one('events.json').get(query).then(davResponseHandler('dav:item'));
    }

    /**
     * Queries all calendars of the logged-in user's calendar home for an event with the given _uid_.
     *
     * @param calendarHomeId {String} The calendar home ID to search in
     * @param uid {String} The event UID to search.
     *
     * @return {Array} The array of dav:items
     */
    function getEventByUID(calendarHomeId, uid) {
      return calDavRequest('report', calPathBuilder.forCalendarHomeId(calendarHomeId), JSON_CONTENT_TYPE_HEADER, { uid: uid }).then(davResponseHandler('dav:item'));
    }

    /**
     * Query one or more calendars for events. The dav:calendar resources will include their dav:item resources.
     * @param  {String}   calendarHomeId The calendarHomeId.
     * @param  {String}   calendarId     The calendarId.
     * @param  {calMoment} start          calMoment type of Date, specifying the start of the range.
     * @param  {calMoment} end            calMoment type of Date, specifying the end of the range.
     * @return {Object}                  An array of dav:item items.
     */
    function listEventsForCalendar(calendarHomeId, calendarId, start, end) {
      var body = {
        match: {
          start: start.format(CAL_DAV_DATE_FORMAT),
          end: end.format(CAL_DAV_DATE_FORMAT)
        }
      };
      var path = calPathBuilder.forCalendarId(calendarHomeId, calendarId);

      return calDavRequest('report', path, JSON_CONTENT_TYPE_HEADER, body)
      .then(davResponseHandler('dav:item'));
    }

    /**
     * List all calendar homes and calendars in the calendar root. A dav:root resource, expanded down to all dav:home resouces.
     * @return {Object}            An array of dav:home items
     */
    function listAllCalendars(options) {
      var path = calPathBuilder.rootPath();

      return calDavRequest('get', path + '/.json', {Accept: CAL_ACCEPT_HEADER}, {}, options)
      .then(davResponseHandler('dav:home'));
    }

    /**
     * List all calendars in the calendar home. A dav:home resource, containing all dav:calendar resources in it.
     * @param  {String} calendarId The calendarHomeId.
     * @param  {object} options    options for more data
     * @return {Object}                An array of dav:calendar
     */
    function listCalendars(calendarId, options) {
      var path = calPathBuilder.forCalendarHomeId(calendarId);

      return calDavRequest('get', path, {Accept: CAL_ACCEPT_HEADER}, {}, options)
      .then(davResponseHandler('dav:calendar'));
    }

    /**
     * Get a calendar (dav:calendar).
     * @param  {String} calendarHomeId The calendarHomeId.
     * @param  {String} calendarId     The calendarId.
     * @return {Object} An array of dav:calendar
     */
    function getCalendar(calendarHomeId, calendarId, options) {
      var path = calPathBuilder.forCalendarId(calendarHomeId, calendarId);

      return calDavRequest('get', path, {Accept: CAL_ACCEPT_HEADER}, {}, options)
      .then(calHttpResponseHandler(200, _.property('data')));
    }

    /**
     * Create a calendar in the specified calendar home.
     * @param  {String}         calendarHomeId   The calendar home id in which to create a new calendar
     * @param  {ICAL.Component} calendar      A dav:calendar object, with an additional member "id" which specifies the id to be used in the calendar url.
     * @return {Object}                        the http response.
     */
    function createCalendar(calendarHomeId, calendar) {
      var path = calPathBuilder.forCalendarHomeId(calendarHomeId);

      return calDavRequest('post', path, null, calendar)
      .then(calHttpResponseHandler(201))
      .catch(function(error) {
        notificationFactory.weakError('Failed to create calendar', 'Cannot join the server, please try later');

        return $q.reject(error);
      });
    }

    /**
     * Delete a calendar in the specified calendar home.
     * @param  {String}         calendarHomeId   The calendar home id in which to delete a new calendar
     * @param  {ICAL.Component} calendarId      A dav:calendar object, with an additional member "id" which specifies the id to be used in the calendar url.
     * @return {Object}                        the http response.
     */
    function removeCalendar(calendarHomeId, calendarId) {
      var path = calPathBuilder.forCalendarId(calendarHomeId, calendarId);

      return calDavRequest('delete', path)
      .then(calHttpResponseHandler(204))
      .catch(function(error) {
        notificationFactory.weakError('Failed to remove calendar', 'Cannot join the server, please try later');

        return $q.reject(error);
      });
    }

    /**
     * Modify a calendar in the specified calendar home.
     * @param  {String}         calendarHomeId   The calendar home id in which to create a new calendar
     * @param  {ICAL.Component} calendar      A dav:calendar object, with an additional member "id" which specifies the id to be used in the calendar url.
     * @return {Object}                        the http response.
     */
    function modifyCalendar(calendarHomeId, calendar) {
      var path = calPathBuilder.forCalendarId(calendarHomeId, calendar.id);

      return calDavRequest('proppatch', path, JSON_CONTENT_TYPE_HEADER, calendar)
      .then(calHttpResponseHandler(204))
      .catch(function(error) {
        notificationFactory.weakError('Failed to modify calendar', 'Cannot join the server, please try later');

        return $q.reject(error);
      });
    }

    /**
     * Get right of this calendar
     * @param  {String}         calendarHomeId   The calendar home id in which to create a new calendar
     * @param  {ICAL.Component} calendar      A dav:calendar object, with an additional member "id" which specifies the id to be used in the calendar url.
     * @return {Object}                        the http response body.
     */
    function getRight(calendarHomeId, calendar) {
      var path = calPathBuilder.forCalendarId(calendarHomeId, calendar.id);

      return calDavRequest('propfind', path, JSON_CONTENT_TYPE_HEADER, {
        prop: ['cs:invite', 'acl']
      }).then(calHttpResponseHandler(200, _.property('data')));
    }

    /**
     * Modify the public rights of a calendar in the specified calendar home.
     * @param  {String}  calendarHomeId  The calendar home id in which to create a new calendar
     * @param  {String} calendarId  The id of the calendar which its public right will be modified
     * @param  {Object} publicRights: the public rights
     * @return {Object} the http response body.
     */
    function modifyPublicRights(calendarHomeId, calendarId, publicRights) {
      var path = calPathBuilder.forCalendarId(calendarHomeId, calendarId);

      return calDavRequest('acl', path, JSON_CONTENT_TYPE_HEADER, publicRights).then(calHttpResponseHandler(200));
    }

    /**
     * Modify the rights for a calendar in the specified calendar home.
     * @param  {String} calendarHomeId  The calendar home id in which to create a new calendar
     * @param  {String} calendarId  The id of the calendar which will be modified
     * @param  {Object} rights
     * @return {Object} the http response.
     */
    function modifyShares(calendarHomeId, calendarId, body) {
      var path = calPathBuilder.forCalendarId(calendarHomeId, calendarId);

      return calDavRequest('post', path, null, body).then(calHttpResponseHandler(200));
    }

    /**
     * PUT request used to create a new event in a specific calendar.
     * @param  {String}         eventPath path of the event. The form is /<calendar_path>/<uuid>.ics
     * @param  {ICAL.Component} vcalendar a vcalendar object including the vevent to create.
     * @param  {Object}         options   {graceperiod: true||false} specify if we want to use the graceperiod or not.
     * @return {String||Object}           a taskId if with use the graceperiod, the http response otherwise.
     */
    function create(eventPath, vcalendar, options) {
      var headers = {'Content-Type': CALENDAR_CONTENT_TYPE_HEADER};
      var body = vcalendar.toJSON();

      if (options.graceperiod) {
        return calDavRequest('put', eventPath, headers, body, {graceperiod: CAL_GRACE_DELAY})
        .then(calGracePeriodResponseHandler);
      }

      return calDavRequest('put', eventPath, headers, body)
      .then(calHttpResponseHandler(201));
      }

    /**
     * PUT request used to modify an event in a specific calendar.
     * @param  {String}         eventPath path of the event. The form is /<calendar_path>/<uuid>.ics
     * @param  {ICAL.Component} vcalendar a vcalendar object including the vevent to create.
     * @param  {String}         etag      set the If-Match header to this etag before sending the request
     * @return {String}                   the taskId which will be used to create the grace period.
     */
    function modify(eventPath, vcalendar, etag) {
      var headers = {
        'Content-Type': CALENDAR_CONTENT_TYPE_HEADER,
        Prefer: CALENDAR_PREFER_HEADER
      };

      if (etag) {
        headers['If-Match'] = etag;
      }

      var body = vcalendar.toJSON();

      return calDavRequest('put', eventPath, headers, body, { graceperiod: CAL_GRACE_DELAY })
      .then(calGracePeriodResponseHandler);
    }

    /**
     * DELETE request used to remove an event in a specific calendar.
     * @param  {String} eventPath path of the event. The form is /<calendar_path>/<uuid>.ics
     * @param  {String} etag      set the If-Match header to this etag before sending the request
     * @return {String}           the taskId which will be used to create the grace period.
     */
    function remove(eventPath, etag) {
      var headers = {'If-Match': etag};

      return calDavRequest('delete', eventPath, headers, null, { graceperiod: CAL_GRACE_DELAY })
      .then(calGracePeriodResponseHandler);
    }

    /**
     * PUT request used to change the participation status of an event
     * @param  {String}         eventPath path of the event. The form is /<calendar_path>/<uuid>.ics
     * @param  {ICAL.Component} vcalendar a vcalendar object including the vevent to create.
     * @param  {String}         etag      set the If-Match header to this etag before sending the request
     * @return {Object}                   the http response.
     */
    function changeParticipation(eventPath, vcalendar, etag) {
      var headers = {
        'Content-Type': CALENDAR_CONTENT_TYPE_HEADER,
        Prefer: CALENDAR_PREFER_HEADER
      };

      if (etag) {
        headers['If-Match'] = etag;
      }
      var body = vcalendar.toJSON();

      return calDavRequest('put', eventPath, headers, body)
      .then(calHttpResponseHandler([200, 204]));
    }
  }
})();
