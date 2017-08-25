(function() {
  'use strict';

  angular.module('esn.calendar')
         .factory('calFullUiConfiguration', calFullUiConfiguration);

  function calFullUiConfiguration(
    $q,
    calBusinessHoursService,
    esnUserConfigurationService,
    _,
    CAL_UI_CONFIG,
    CAL_USER_CONFIGURATION
  ) {
    var _isDeclinedEventsHidden = false;

    var handler = {
      workingDays: _workingDays,
      hideDeclinedEvents: _hideDeclinedEvents
    };

    var service = {
      get: get,
      isDeclinedEventsHidden: isDeclinedEventsHidden,
      setHiddenDeclinedEvents: setHiddenDeclinedEvents
    };

    return service;

    ////////////

    function get() {
      return esnUserConfigurationService.get(CAL_USER_CONFIGURATION.keys, CAL_USER_CONFIGURATION.moduleName)
        .then(function(configurations) {
          var setConfigurations = configurations.map(function(configuration) {
            if (!handler[configuration.name] || !configuration.value) {
              return {};
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

    function _workingDays() {
      function hasDowKey(businessHour) {
        return _.has(businessHour, 'dow');
      }

      return calBusinessHoursService.getUserBusinessHours().then(function(userBusinessHours) {
        var workingDays = _.result(_.find(userBusinessHours, hasDowKey), 'dow') || CAL_UI_CONFIG.calendarDefaultDaysValue;

        return { hiddenDays: _.difference(CAL_UI_CONFIG.calendarDaysValue, workingDays) };
      });
    }

    function _hideDeclinedEvents() {
      setHiddenDeclinedEvents(true);

      return {};
    }

    function setHiddenDeclinedEvents(status) {
      _isDeclinedEventsHidden = status;
    }

    function isDeclinedEventsHidden() {
      return _isDeclinedEventsHidden;
    }
  }
})();
