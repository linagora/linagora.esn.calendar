'use strict';

/* global chai: false */

var expect = chai.expect;

describe('The cal-resource-item component', function() {
  var $compile, $rootScope, $scope, CAL_RESOURCE, element, partstat;
  var resource, classes;

  beforeEach(function() {
    module('esn.calendar');
    module('jadeTemplates');
  });

  beforeEach(inject(function(_$compile_, _$rootScope_, _CAL_ICAL_, _CAL_RESOURCE_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    $scope = $rootScope.$new();
    partstat = _CAL_ICAL_.partstat;
    CAL_RESOURCE = _CAL_RESOURCE_;
    classes = '.cal-resource-item .cal-participation-status i.mdi.';
  }));

  beforeEach(function() {
    resource = {
      name: 'room5',
      description: 'a resource'
    };
  });

  function compileComponent(html) {
    element = angular.element(html);
    $compile(element)($scope);
    $scope.$digest();
  }

  it('should display resource participation status set to accepted', function() {
    resource.partstat = partstat.accepted;
    $scope.resource = resource;

    compileComponent('<cal-resource-item resource="resource"/>');

    var pathAccepted = classes + CAL_RESOURCE.PARTSTAT_ICONS[resource.partstat].split(' ').join('.');

    expect(element.find(pathAccepted)[0]).to.exist;
  });

  it('should display resource participation status set to declined', function() {
    resource.partstat = partstat.declined;
    $scope.resource = resource;

    compileComponent('<cal-resource-item resource="resource"/>');

    var pathDeclined = classes + CAL_RESOURCE.PARTSTAT_ICONS[resource.partstat].split(' ').join('.');

    expect(element.find(pathDeclined)[0]).to.exist;
  });

  it('should display resource participation status set to tentative', function() {
    resource.partstat = partstat.tentative;
    $scope.resource = resource;

    compileComponent('<cal-resource-item resource="resource"/>');

    var pathTentative = classes + CAL_RESOURCE.PARTSTAT_ICONS[resource.partstat].split(' ').join('.');

    expect(element.find(pathTentative)[0]).to.exist;
  });
});
