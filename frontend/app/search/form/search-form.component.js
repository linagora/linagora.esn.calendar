(function(angular) {
  'use strict';

  angular.module('esn.calendar').component('eventSearchForm', {
    templateUrl: '/calendar/app/search/form/search-form.html',
    controller: 'EventSearchFormController',
    bindings: {
      query: '='
    }
  });
})(angular);
