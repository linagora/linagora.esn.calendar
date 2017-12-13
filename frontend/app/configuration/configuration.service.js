(function(angular) {
  'use strict';

  angular.module('esn.calendar').factory('calConfigurationService', calConfigurationService);

  function calConfigurationService(esnUserConfigurationService, CAL_CORE_CONFIGURATION) {
    var user = {};

    return {
      init: init,
      use24hourFormat: use24hourFormat,
      get: get,
      getUserConfiguration: getUserConfiguration
    };

    function init() {
      return getUserConfiguration().then(function(userConfiguration) {
        user = userConfiguration;
      });
    }

    function get() {
      return {
        user: user
      };
    }

    function use24hourFormat() {
      return user.datetime && user.datetime.use24hourFormat;
    }

    function getUserConfiguration() {
      return esnUserConfigurationService.get(CAL_CORE_CONFIGURATION.keys)
        .then(function(configurations) {
          var userConfiguration = {};

          configurations.forEach(function(configuration) {
            userConfiguration[configuration.name] = configuration.value;
          });

          return userConfiguration;
        });
    }
  }
})(angular);
