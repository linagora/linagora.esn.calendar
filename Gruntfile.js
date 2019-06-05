'use strict';

var timeGrunt = require('time-grunt');

module.exports = function(grunt) {
  timeGrunt(grunt);

  grunt.initConfig({
    eslint: {
      all: {
        src: ['Gruntfile.js', 'Gruntfile-tests.js', 'index.js', 'tasks/**/*.js', 'test/**/**/*.js', 'backend/**/*.js', 'frontend/app/**/*.js']
      },
      quick: {
        src: [],
        options: {
          quiet: true
        }
      },
      options: {
        quiet: true
      }

    },
    lint_pattern: {
      options: {
        rules: [
          { pattern: /(describe|it)\.only/, message: 'Must not use .only in tests' }
        ]
      },
      all: {
        src: ['<%= eslint.all.src %>']
      },
      css: {
        options: {
          rules: [
            { pattern: /important;(\s*$|(?=\s+[^\/]))/, message: 'CSS important rules only allowed with explanatory comment' }
          ]
        },
        src: [
          'frontend/app/**/*.less'
        ]
      },
      quick: {
        src: ['<%= eslint.quick.src %>']
      }
    },

    splitfiles: {
      options: {
        chunk: 10
      },
      backend: {
        options: {
          common: ['test/unit-backend/all.js'],
          target: 'mochacli:backend'
        },
        files: {
          src: ['test/unit-backend/**/*.js']
        }
      },
      midway: {
        options: {
          common: ['test/midway-backend/all.js'],
          target: 'mochacli:midway'
        },
        files: {
          src: ['test/midway-backend/**/*.js']
        }
      }
    },
    mochacli: {
      options: {
        flags: process.env.INSPECT ? ['--debug-brk', '--inspect'] : [],
        require: ['chai', 'mockery'],
        reporter: 'spec',
        timeout: process.env.TEST_TIMEOUT || 20000,
        env: {
          ESN_CUSTOM_TEMPLATES_FOLDER: 'testscustom'
        }
      },
      backend: {
        options: {
          files: ['test/unit-backend/all.js', grunt.option('test') || 'test/unit-backend/**/*.js']
        }
      },
      midway: {
        options: {
          files: ['test/midway-backend/all.js', grunt.option('test') || 'test/midway-backend/**/*.js']
        }
      }
    },
    karma: {
      unit: {
        configFile: './test/config/karma.conf.js',
        browsers: ['PhantomJS']
      },
      all: {
        configFile: './test/config/karma.conf.js',
        browsers: ['PhantomJS', 'Firefox', 'Chrome']
      }
    },

    i18n_checker: {
      all: {
        options: {
          baseDir: __dirname,
          dirs: [{
            localeDir: 'backend/lib/i18n/locales',
            templateSrc: [
              'frontend/app/**/*.pug'
            ],
            core: true
          }],
          verifyOptions: {
            defaultLocale: 'en',
            locales: ['en', 'fr', 'vi', 'zh'],
            rules: [
              'all-keys-translated',
              'all-locales-present',
              'default-locale-translate',
              'key-trimmed',
              'no-duplicate-among-modules',
              'no-duplicate-with-core',
              'valid-json-file'
            ]
          }
        }
      }
    },

    puglint: {
      all: {
        options: {
          config: {
            disallowAttributeInterpolation: true,
            disallowLegacyMixinCall: true,
            validateExtensions: true,
            validateIndentation: 2
          }
        },
        src: [
          'frontend/**/*.pug',
          'templates/**/*.pug'
        ]
      }
    },

    swagger_generate: {
      options: {
        baseDir: __dirname,
        swaggerOutputFile: '/doc/swagger.json',
        info: {
          title: 'OpenPaaS Calendar Module',
          description: 'OpenPaaS Calendar Module API',
          version: '0.1'
        },
        host: 'localhost:8080',
        securityDefinitions: {
          auth: {
            type: 'oauth2',
            description: 'OAuth2 security scheme for the OpenPaaS Calendar Module API',
            flow: 'password',
            tokenUrl: 'localhost:8080/oauth/token',
            scopes: {}
          }
        },
        paths: [
          'doc/swagger/*/*.js',
          'backend/webserver/api/*/*.js',
          'node_modules/linagora-rse/doc/REST_API/swagger/*/*.js',
          'modules/*/backend/webserver/**/*.js'
        ]
      }
    }
  });

  grunt.loadTasks('tasks');

  grunt.loadNpmTasks('@linagora/grunt-lint-pattern');
  grunt.loadNpmTasks('grunt-mocha-cli');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-shell-spawn');
  grunt.loadNpmTasks('grunt-continue');
  grunt.loadNpmTasks('@linagora/grunt-run-grunt');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-wait-server');
  grunt.loadNpmTasks('@linagora/grunt-i18n-checker');
  grunt.loadNpmTasks('grunt-puglint');
  grunt.loadNpmTasks('grunt-swagger-generate');
  grunt.loadNpmTasks('grunt-release');

  grunt.loadTasks('tasks');
  grunt.registerTask('i18n', 'Check the translation files', ['i18n_checker']);
  grunt.registerTask('pug-linter', 'Check the pug/jade files', ['puglint:all']);
  grunt.registerTask('linters', 'Check code for lint', ['eslint:all', 'lint_pattern:all', 'lint_pattern:css', 'i18n', 'pug-linter']);
  grunt.registerTask('linters-dev', 'Check changed files for lint', ['prepare-quick-lint', 'eslint:quick', 'lint_pattern:quick']);
  grunt.registerTask('test-midway-backend', ['splitfiles:midway']);
  grunt.registerTask('test-unit-backend', 'Test backend code', ['mochacli:backend']);
  grunt.registerTask('test-frontend', 'Test frontend code', ['karma:unit']);

  grunt.registerTask('swagger-generate', 'Grunt plugin for swagger generate', ['swagger_generate']);

  grunt.registerTask('test', ['linters', 'test-frontend', 'test-unit-backend', 'test-midway-backend']);
  grunt.registerTask('default', ['test']);
  grunt.registerTask('swagger-generate', 'Grunt plugin for swagger generate', ['swagger_generate']);
};
