(function(angular) {
  'use strict';

  angular.module('esn.calendar')
    .config(routesConfig);

  function routesConfig($stateProvider, routeResolver) {
    $stateProvider
      .state('calendarForCommunities', {
        url: '/calendar/communities/:community_id',
        templateUrl: '/calendar/app/community/community-calendar',
        abstract: true,
        resolve: {
          community: routeResolver.api('communityAPI', 'get', 'community_id', '/communities')
        },
        reloadOnSearch: false
      })
      .state('calendarForCommunities.main', {
        url: '',
        views: {
          content: {
            template: '<calendar-view calendar-home-id="calendarHomeId" ui-config="uiConfig"/>',
            controller: function($scope, community, CAL_UI_CONFIG) {
              $scope.calendarHomeId = community._id;
              $scope.uiConfig = angular.copy(CAL_UI_CONFIG);
              $scope.uiConfig.calendar.editable = false;
              $scope.uiConfig.calendar.selectable = false;
            }
          }
        }
      });
    }
})(angular);
