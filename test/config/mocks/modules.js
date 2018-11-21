'use strict';

angular.module('esn.message', []);
angular.module('hl.sticky', []);
angular.module('esn.calendar.event-consultation', []);
angular.module('ngCookies', []);
angular.module('pascalprecht.translate', [])
  .service('$translate', function() {
    return {
      preferredLanguage: function() { return ''; },
      use: function() {},
      instant: function() {}
    };
  });
