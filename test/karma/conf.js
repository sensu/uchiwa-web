// karma.conf.js
module.exports = function(config) {
  config.set({
    basePath : '../../',
    frameworks: ['jasmine'],
    files : [
      'bower_components/underscore/underscore.js',
      'bower_components/angular/angular.js',
      'bower_components/angular-bootstrap/ui-bootstrap-tpls.min.js',
      'bower_components/angular-cookies/angular-cookies.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'bower_components/angular-route/angular-route.js',
      'bower_components/angular-sanitize/angular-sanitize.js',
      'bower_components/angular-toastr/dist/angular-toastr.min.js',
      'bower_components/moment/min/moment.min.js',
      'bower_components/angular-moment/angular-moment.js',
      'bower_components/highlightjs/highlight.pack.js',
      'bower_components/angular-gravatar/build/angular-gravatar.js',
      'partials/**/*.html',
      'js/**/*.js',
      'test/karma/**/*.js'
    ],
    reporters: ['junit', 'coverage', 'dots'],
    coverageReporter: {
      type: 'lcov',
      dir: 'build/coverage/',
      subdir: '.'
    },
    ngHtml2JsPreprocessor: {
        moduleName: 'partials'
    },
    preprocessors: {
      'js/**/*.js': ['coverage'],
      'partials/**/*.html': ['ng-html2js']
    },
    junitReporter: {
      outputFile: 'build/karma/test-results.xml'
    },
    port: 8876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    captureTimeout: 60000,
    singleRun: true
  });
};
