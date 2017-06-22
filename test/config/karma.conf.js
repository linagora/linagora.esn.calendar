'use strict';

module.exports = function(config) {
  var singleRun = process.env.SINGLE_RUN ? process.env.SINGLE_RUN !== 'false' : true;

  config.set({
    basePath: '../../',
    files: [
      'frontend/components/mdi/css/materialdesignicons.min.css',
      'frontend/components/jquery/dist/jquery.js',
      'frontend/components/jquery-mockjax/dist/jquery.mockjax.js',
      'frontend/components/angular/angular.js',
      'frontend/components/angular-mocks/angular-mocks.js',
      'frontend/components/angular-ui-router/release/angular-ui-router.js',
      'frontend/components/ui-router-extras/release/ct-ui-router-extras.min.js',
      'frontend/components/angular-messages/angular-messages.min.js',
      'frontend/components/angular-route/angular-route.js',
      'frontend/components/angular-animate/angular-animate.js',
      'frontend/components/angular-strap/dist/angular-strap.js',
      'frontend/components/angular-strap/dist/angular-strap.tpl.js',
      'frontend/components/lodash/dist/lodash.min.js',
      'frontend/components/lng-clockpicker/dist/bootstrap-clockpicker.js',
      'frontend/components/angular-clockpicker/dist/angular-clockpicker.min.js',
      'frontend/components/restangular/dist/restangular.js',
      'frontend/components/openpaas-logo/openpaas-logo.js',
      'frontend/components/chai/chai.js',
      'frontend/components/chai-datetime/chai-datetime.js',
      'frontend/components/sinon-chai/lib/sinon-chai.js',
      'node_modules/sinon/pkg/sinon.js',
      'node_modules/chai-shallow-deep-equal/chai-shallow-deep-equal.js',
      'frontend/components/ngInfiniteScroll/build/ng-infinite-scroll.js',
      'frontend/components/ng-tags-input/ng-tags-input.js',
      'frontend/components/angular-xeditable/dist/js/xeditable.js',
      'frontend/components/moment/moment.js',
      'frontend/components/moment-timezone/builds/moment-timezone-with-data-2010-2020.min.js',
      'frontend/components/angular-moment/angular-moment.js',
      'frontend/components/jstzdetect/jstz.min.js',
      'frontend/components/angular-jstz/angular-jstz.js',
      'frontend/components/angular-file-upload/dist/angular-file-upload-shim.min.js',
      'frontend/components/angular-file-upload/dist/angular-file-upload.min.js',
      'frontend/components/angular-truncate/src/truncate.js',
      'frontend/components/angular-sanitize/angular-sanitize.min.js',
      'frontend/components/angular-touch/angular-touch.min.js',
      'frontend/components/angular-leaflet-directive/dist/angular-leaflet-directive.js',
      'frontend/components/ngGeolocation/ngGeolocation.min.js',
      'frontend/components/angular-recursion/angular-recursion.min.js',
      'frontend/components/fullcalendar/dist/fullcalendar.min.js',
      'frontend/components/ical.js/build/ical.js',
      'frontend/components/angular-uuid4/angular-uuid4.min.js',
      'frontend/components/localforage/dist/localforage.min.js',
      'frontend/components/angular-localforage/dist/angular-localForage.js',
      'node_modules/async/dist/async.js',
      'frontend/components/angular-bootstrap-switch/dist/angular-bootstrap-switch.js',
      'frontend/components/showdown/dist/showdown.min.js',
      'frontend/components/angular-markdown-directive/markdown.js',
      'frontend/components/angular-material/angular-material.min.js',
      'frontend/components/angular-scroll/angular-scroll.js',
      'frontend/components/blueimp-canvas-to-blob/js/canvas-to-blob.js',
      'frontend/components/re-tree/re-tree.js',
      'frontend/components/ng-device-detector/ng-device-detector.js',
      'frontend/components/remarkable-bootstrap-notify/bootstrap-notify.min.js',
      'frontend/components/char-api/lib/charAPI.js',
      'frontend/components/jmap-client/dist/jmap-client.js',
      'frontend/components/dynamic-directive/dist/dynamic-directive.min.js',
      'frontend/components/angularjs-naturalsort/dist/naturalSortVersion.min.js',
      'frontend/components/bootstrap/dist/js/bootstrap.min.js',
      'frontend/components/summernote/dist/summernote.js',
      'frontend/components/angular-summernote/dist/angular-summernote.min.js',
      'frontend/components/autosize/dist/autosize.min.js',
      'frontend/components/offline/offline.min.js',
      'frontend/components/matchmedia-ng/matchmedia-ng.js',
      'frontend/components/jquery.focus/dist/jquery.focus.js',
      'frontend/components/angular-feature-flags/dist/featureFlags.js',
      'frontend/components/angular-auto-focus/angular-auto-focus.js',
      'frontend/components/awesome-angular-swipe/lib/awesome-angular-swipe.js',
      'frontend/components/Autolinker.js/dist/Autolinker.js',
      'frontend/components/angular-translate/angular-translate.min.js',
      'frontend/components/angular-component/dist/angular-component.min.js',
      'frontend/components/waves/dist/waves.min.js',

      'node_modules/linagora-rse/test/fixtures/**/*.js',
      'node_modules/linagora-rse/frontend/js/modules/**/*.module.js',
      'node_modules/linagora-rse/frontend/js/modules/**/*.js',
      'node_modules/linagora-rse/frontend/views/modules/**/*.jade',
      'node_modules/linagora-rse/frontend/js/*.js',

      'node_modules/linagora-rse/modules/linagora.esn.graceperiod/frontend/js/*.js',

      'test/config/mocks/*.js',
      'frontend/app/app.js',
      'frontend/app/**/*.js',
      'frontend/app/**/*.jade',
      'frontend/app/*.js',

      { pattern: 'node_modules/linagora-rse/frontend/js/modules/i18n/i18n.config.js', watched: false, included: false, served: true },
      { pattern: 'frontend/images/*.*', watched: false, included: false, served: true },
      { pattern: 'frontend/components/mdi/fonts/*.*', watched: false, included: false, served: true },
      'test/unit-frontend/fixtures/**',
      'frontend/app/fixtures/**'
    ],
    exclude: [
      'node_modules/linagora-rse/frontend/js/**/*.spec.js',
      'node_modules/linagora-rse/frontend/js/**/*.run.js',
      'frontend/app/search/search.run.js'
    ],
    frameworks: ['mocha'],
    colors: true,
    singleRun: singleRun,
    autoWatch: true,
    browsers: ['PhantomJS', 'Chrome', 'Firefox'],

    customLaunchers: {
      Chrome_with_debugging: {
        base: 'Chrome',
        flags: ['--remote-debugging-port=9222'],
        debug: true
      }
    },

    proxies: {
      '/images/': '/base/frontend/images/'
    },

    reporters: singleRun ? ['coverage', 'spec'] : ['spec'],

    preprocessors: {
      'frontend/app/**/*.js': ['coverage'],
      '**/*.jade': ['ng-jade2module'],
      'test/unit-frontend/fixtures/**': ['raw2js'],
      'frontend/app/fixtures/**': ['raw2js']
    },

    plugins: [
      'karma-phantomjs-launcher',
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-mocha',
      'karma-coverage',
      'karma-spec-reporter',
      'karma-ng-jade2module-preprocessor',
      'karma-rawfixtures-preprocessor'
    ],

    coverageReporter: {type: 'text', dir: '/tmp'},

    ngJade2ModulePreprocessor: {
      stripPrefix: 'frontend',
      prependPrefix: '/linagora.esn.calendar',
      cacheIdFromPath: function(filepath) {
        return filepath
          .replace(/jade$/, 'html')
          .replace(/^frontend/, '/calendar')
          .replace(/^node_modules\/linagora-rse\/frontend/, '');
      },
      // setting this option will create only a single module that contains templates
      // from all the files, so you can load them all with module('templates')
      jadeRenderOptions: {
        basedir: require('path').resolve(__dirname, '../../node_modules/linagora-rse/frontend/views')
      },
      jadeRenderLocals: {
        __: function(str) {
          return str;
        }
      },
      moduleName: 'jadeTemplates'
    }

  });
};
