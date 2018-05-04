(function() {
  'use strict';

  angular.module('esn.calendar')
         .factory('calFreebusyAPI', calFreebusyAPI);

  function calFreebusyAPI(
    calDavRequest,
    calHttpResponseHandler,
    calGracePeriodResponseHandler,
    CAL_DAV_DATE_FORMAT
  ) {
    return {
      report: report
    };

    ////////////

    function report(calendarHref, start, end) {
      var body = {
        type: 'free-busy-query',
        match: {
          start: start.tz('Zulu').format(CAL_DAV_DATE_FORMAT),
          end: end.tz('Zulu').format(CAL_DAV_DATE_FORMAT)
        }
      };

      return calDavRequest('report', calendarHref, { 'Content-Type': 'application/json' }, body)
        .then(function(response) {
          return response.data && response.data.data || [];
        });
    }
  }
})();
