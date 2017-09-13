'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The calFullUiConfiguration service', function() {
  var $q,
  $httpBackend,
  $translate,
  calFullUiConfiguration,
  esnConfig,
  esnUserConfigurationService,

  moduleName,
  moduleConfiguration,
  businessHours,
  uiConfig,
  CAL_UI_CONFIG,
  CAL_FULLCALENDAR_LOCALE;

  beforeEach(function() {
    angular.mock.module('esn.calendar');
    moduleName = 'linagora.esn.calendar';
    moduleConfiguration = ['onlyWorkingDays', 'hideRefusedEvents'];

    businessHours = [{
      daysOfWeek: [1, 5, 6],
      start: '00:00',
      end: '25:00'
    }];
    uiConfig = {
      calendar: {}
    };
    moduleName = 'linagora.esn.calendar';
    moduleConfiguration = ['workingDays', 'hideDeclinedEvents'];

    esnConfig = sinon.spy(function() {
      return $q.when(businessHours);
    });

    angular.mock.module(function($provide) {
      $provide.value('esnConfig', esnConfig);
    });
  });

  beforeEach(angular.mock.inject(function(
    _$rootScope_,
    _$q_,
    _$httpBackend_,
    _$translate_,
    _calFullUiConfiguration_,
    _esnUserConfigurationService_,
    _CAL_UI_CONFIG_,
    _CAL_FULLCALENDAR_LOCALE_
  ) {
    calFullUiConfiguration = _calFullUiConfiguration_;
    esnUserConfigurationService = _esnUserConfigurationService_;
    $q = _$q_;
    $httpBackend = _$httpBackend_;
    $translate = _$translate_;
    CAL_UI_CONFIG = _CAL_UI_CONFIG_;
    CAL_FULLCALENDAR_LOCALE = _CAL_FULLCALENDAR_LOCALE_;
  }));

  describe('The get function', function() {
    it('should return the default configuration if no configuration value', function(done) {
      var payload = [
        {
          name: moduleName,
          keys: moduleConfiguration
        }
      ];
      var httpResponse = [
        {
          name: moduleName,
          configurations: [{
            name: 'workingDays',
            value: null
          }]
        }
      ];

      sinon.spy(esnUserConfigurationService, 'get');
      $httpBackend.expectPOST('/api/configurations?scope=user', payload).respond(httpResponse);
      calFullUiConfiguration.get()
        .then(function(uiConfiguration) {
          expect(uiConfiguration).to.deep.equal(CAL_UI_CONFIG);
          expect(esnUserConfigurationService.get).to.have.been.calledOnce;
          expect(esnUserConfigurationService.get).to.have.been.calledWith(moduleConfiguration, moduleName);

          done();
        });

      $httpBackend.flush();
    });

    describe('The _setOnlyWorkingDays function', function() {
      it('should get default hiddenDays if business hours is not defined', function(done) {
        var expectedResult = [0, 6];
        var payload = [
          {
            name: moduleName,
            keys: moduleConfiguration
          }
        ];
        var httpResponse = [
          {
            name: moduleName,
            configurations: [{
              name: 'workingDays',
              value: true
            }]
          }
        ];

        businessHours = [];
        sinon.spy(esnUserConfigurationService, 'get');
        $httpBackend.expectPOST('/api/configurations?scope=user', payload).respond(httpResponse);
        calFullUiConfiguration.get()
          .then(function(uiConfiguration) {
            expect(uiConfiguration.calendar.hiddenDays).to.deep.equal(expectedResult);

            done();
          });

        $httpBackend.flush();
      });

      it('should set hiddenDays from  business hours', function(done) {
        var expectedResult = [0, 2, 3, 4];
        var payload = [
          {
            name: moduleName,
            keys: moduleConfiguration
          }
        ];
        var httpResponse = [
          {
            name: moduleName,
            configurations: [{
              name: 'workingDays',
              value: []
            }]
          }
        ];

        sinon.spy(esnUserConfigurationService, 'get');
        $httpBackend.expectPOST('/api/configurations?scope=user', payload).respond(httpResponse);
        calFullUiConfiguration.get()
          .then(function(uiConfiguration) {
            expect(uiConfiguration.calendar.hiddenDays).to.deep.equal(expectedResult);

            done();
          });

        $httpBackend.flush();
      });
    });
  });

  describe('The isDeclinedEventsHidden function', function() {
    it('should be false if no status is set', function() {
      expect(calFullUiConfiguration.isDeclinedEventsHidden()).to.be.false;
    });

    it('should be false if configuration return no value', function(done) {
      var payload = [
          {
            name: moduleName,
            keys: moduleConfiguration
          }
        ];
        var httpResponse = [
          {
            name: moduleName,
            configurations: [{
              name: 'hideRefusedEvents'
            }]
          }
        ];

        sinon.spy(esnUserConfigurationService, 'get');
        $httpBackend.expectPOST('/api/configurations?scope=user', payload).respond(httpResponse);
        calFullUiConfiguration.get()
          .then(function() {
            expect(calFullUiConfiguration.isDeclinedEventsHidden()).to.be.false;

            done();
          });

        $httpBackend.flush();
    });

    it('should be true if configuration return true', function(done) {
      var payload = [
          {
            name: moduleName,
            keys: moduleConfiguration
          }
        ];
        var httpResponse = [
          {
            name: moduleName,
            configurations: [{
              name: 'hideDeclinedEvents',
              value: true
            }]
          }
        ];

        sinon.spy(esnUserConfigurationService, 'get');
        $httpBackend.expectPOST('/api/configurations?scope=user', payload).respond(httpResponse);
        calFullUiConfiguration.get()
          .then(function() {
            expect(calFullUiConfiguration.isDeclinedEventsHidden()).to.be.true;

            done();
          });

        $httpBackend.flush();
    });
  });

  describe('The configureLocaleForCalendar function', function() {
    function _setPreferredLanguage(locale) {
      $translate.preferredLanguage = sinon.spy(function() {
        return locale;
      });
    }

    it('should set calendar locale configuration with default value if no preferred locale', function() {
      _setPreferredLanguage(null);

      var config = calFullUiConfiguration.configureLocaleForCalendar(uiConfig);

      expect(config.calendar.locale).to.be.equal(CAL_FULLCALENDAR_LOCALE.default);
    });

    it('should set calendar locale configuration with default value if preferred locale is not supported by fullcalendar', function() {
      [
        'key',
        'key//local',
        'l.i'
      ].forEach(function(locale) {
      _setPreferredLanguage(locale);

      var config = calFullUiConfiguration.configureLocaleForCalendar(uiConfig);

      expect(config.calendar.locale).to.be.equal(CAL_FULLCALENDAR_LOCALE.default);
      });
    });

    it('should not care about case sensitive', function() {
      [
        'fr_ca',
        'FR_CA',
        'Fr_ca',
        'fr_Ca',
        'FR_ca'
      ].forEach(function(locale) {
      _setPreferredLanguage(locale);

      var config = calFullUiConfiguration.configureLocaleForCalendar(uiConfig);

      expect(config.calendar.locale).to.be.equal('fr-ca');
      });
    });

    it('should not care about the separator', function() {
      [
        'fr_ca',
        'fr-ca',
        'fr*ca',
        'fr/ca',
        'fr_-/ca',
        'fr:./ca'
      ].forEach(function(locale) {
      _setPreferredLanguage(locale);

      var config = calFullUiConfiguration.configureLocaleForCalendar(uiConfig);

      expect(config.calendar.locale).to.be.equal('fr-ca');
      });
    });

    it('should set calendar locale configuration with closest value as possible', function() {
      [
        'fr_MMM',
        'fR///local',
        'FR.i'
      ].forEach(function(locale) {
      _setPreferredLanguage(locale);

      var config = calFullUiConfiguration.configureLocaleForCalendar(uiConfig);

      expect(config.calendar.locale).to.be.equal('fr');
      });
    });
  });
});