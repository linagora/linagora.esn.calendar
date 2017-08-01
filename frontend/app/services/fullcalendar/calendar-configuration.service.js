(function() {
  'use strict';

  angular.module('esn.calendar')
         .factory('calFullUiConfiguration', calFullUiConfiguration);

  function calFullUiConfiguration(
    $q,
    esnUserConfigurationService,
    calBusinessHoursService,
    _,
    CAL_UI_CONFIG,
    CAL_USER_CONFIGURATION
  ) {
    var handler = {
<<<<<<< 2ed8e605b18ecab73601e1fb051529d97c374b13
      workingDays: _showWorkingDays
=======
      onlyWorkingDays: _setOnlyWorkingDays
>>>>>>> linagora/lgs/openpaas/openpaas-roadmap#15 calFullUiConfiguration services
    };

    var service = {
      get: get
    };

    return service;

    ////////////

    function get() {
      return esnUserConfigurationService.get(CAL_USER_CONFIGURATION.keys, CAL_USER_CONFIGURATION.moduleName)
        .then(function(configurations) {
          var setConfigurations = configurations.map(function(configuration) {
            if (!configuration.value) {
              return $q.when({});
            }

            return handler[configuration.name]();
          });

          return $q.all(setConfigurations);
        })
        .then(function(configurationsSetted) {
          var uiConfig = angular.copy(CAL_UI_CONFIG);

          configurationsSetted.push(CAL_UI_CONFIG.calendar);
          uiConfig.calendar = angular.extend.apply(null, configurationsSetted);

          return uiConfig;
        });
    }

    function _showWorkingDays() {
      function hasDowKey(businessHour) {
        return _.has(businessHour, 'dow');
      }

      return calBusinessHoursService.getUserBusinessHours().then(function(userBusinessHours) {
        var workingDays = _.result(_.find(userBusinessHours, hasDowKey), 'dow') || CAL_UI_CONFIG.calendarDefaultDaysValue;

        return { hiddenDays: _.difference(CAL_UI_CONFIG.calendarDaysValue, workingDays) };
      });
    }
  }

})();
