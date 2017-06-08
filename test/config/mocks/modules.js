'use strict';

angular.module('pascalprecht.translate', []);
angular.module('esn.message', []);
angular.module('esn.i18n', [])
  .factory('esnI18nService', function() {
    return {
      translate: function(input) {
        return {
          toString: function() { return input; }
        };
      }
    };
  })
  .filter('translate', function() {
    return function(input) { return input; };
  })
  .factory('$translate', function() {
    return {
      instant: function() { }
    };
  });
