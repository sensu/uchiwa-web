'use strict';

angular.module('uchiwa', [
  'uchiwa.common',
  'uchiwa.controllers',
  'uchiwa.constants',
  'uchiwa.directives',
  'uchiwa.factories',
  'uchiwa.filters',
  'uchiwa.services',
  // Angular dependencies
  'ngCookies',
  'ngResource',
  'ngRoute',
  'ngSanitize',
  // 3rd party dependencies
  'angularMoment',
  'ng.jsoneditor',
  'moment-picker',
  'toastr',
  'ui.bootstrap',
  'ui.gravatar'
]);

angular.module('uchiwa')
.config(['$httpProvider', '$routeProvider', 'toastrConfig', 'VERSION', '$uibTooltipProvider',
  function ($httpProvider, $routeProvider, toastrConfig, VERSION, $uibTooltipProvider) {
    // Toastr configuration
    angular.extend(toastrConfig, {
      positionClass: 'toast-bottom-right',
      preventOpenDuplicates: true,
      timeOut: 7500
    });

    // Token injection
    $httpProvider.interceptors.push('authInterceptor');

    // Routing
    $routeProvider
      .when('/', {redirectTo: function () {
        return '/events';
      }})
      .when('/aggregates/:dc/:name/:members?/:severity?', {templateUrl: 'bower_components/uchiwa-web/partials/views/aggregate.html?v=' + VERSION, reloadOnSearch: false, controller: 'AggregateController'})
      .when('/aggregates', {templateUrl: 'bower_components/uchiwa-web/partials/views/aggregates.html?v=' + VERSION, reloadOnSearch: false, controller: 'AggregatesController'})
      .when('/checks', {templateUrl: 'bower_components/uchiwa-web/partials/views/checks.html?v=' + VERSION, reloadOnSearch: false, controller: 'ChecksController'})
      .when('/client/:dc/:client', {templateUrl: 'bower_components/uchiwa-web/partials/views/client.html?v=' + VERSION, reloadOnSearch: false, controller: 'ClientController'})
      .when('/clients', {templateUrl: 'bower_components/uchiwa-web/partials/views/clients.html?v=' + VERSION, reloadOnSearch: false, controller: 'ClientsController'})
      .when('/datacenters', {templateUrl: 'bower_components/uchiwa-web/partials/views/datacenters.html?v=' + VERSION, controller: 'DatacentersController'})
      .when('/datacenters/:id', {templateUrl: 'bower_components/uchiwa-web/partials/views/datacenter.html?v=' + VERSION, controller: 'DatacenterController'})
      .when('/events', {templateUrl: 'bower_components/uchiwa-web/partials/views/events.html?v=' + VERSION, reloadOnSearch: false, controller: 'EventsController'})
      .when('/info', {templateUrl: 'bower_components/uchiwa-web/partials/views/info.html?v=' + VERSION, controller: 'InfoController'})
      .when('/login', {templateUrl: 'bower_components/uchiwa-web/partials/login/index.html?v=' + VERSION, controller: 'LoginController'})
      .when('/settings', {templateUrl: 'bower_components/uchiwa-web/partials/views/settings.html?v=' + VERSION, controller: 'SettingsController'})
      .when('/silenced', {templateUrl: 'bower_components/uchiwa-web/partials/views/silenced.html?v=' + VERSION, reloadOnSearch: false, controller: 'SilencedController'})
      .when('/silenced/:id*', {templateUrl: 'bower_components/uchiwa-web/partials/views/silenced-entry.html?v=' + VERSION, reloadOnSearch: false, controller: 'SilencedEntryController'})
      .when('/stashes', {templateUrl: 'bower_components/uchiwa-web/partials/views/stashes.html?v=' + VERSION, reloadOnSearch: false, controller: 'StashesController'})
      .when('/stashes/:id*', {templateUrl: 'bower_components/uchiwa-web/partials/views/stash.html?v=' + VERSION, reloadOnSearch: false, controller: 'StashController'})
      .otherwise('/');

    $uibTooltipProvider.options({animation: false, 'placement': 'bottom'});

    var parser = new UAParser(); // jshint ignore:line
    var result = parser.getResult();
    var touch = result.device && (result.device.type === 'tablet' || result.device.type === 'mobile');
    if (touch) {
      $uibTooltipProvider.options({trigger: 'dontTrigger'});
    } else {
      $uibTooltipProvider.options({trigger: 'mouseenter'});
    }
  }
])
.run(function (backendService, Config, $cookieStore, $location, $rootScope, titleFactory, VERSION) {
  $rootScope.partialsPath = 'bower_components/uchiwa-web/partials';
  $rootScope.skipOneRefresh = false;
  $rootScope.showCollectionBar = true;
  $rootScope.enterprise = false;
  $rootScope.favicon = Config.favicon;
  $rootScope.isAuthenticated = angular.isDefined($cookieStore.get('user')) || false;
  $rootScope.titleFactory = titleFactory;
  $rootScope.version = VERSION;
  $rootScope.versionParam = '?v=' + $rootScope.version;

  // fetch the sensu data on every page change
  $rootScope.$on('$routeChangeSuccess', function () {
    if ($location.path().substring(0, 6) !== '/login') {
      backendService.getDatacenters();
    }
  });
});

// Gravatar
angular.module('ui.gravatar').config([
  'gravatarServiceProvider', function(gravatarServiceProvider) {
    gravatarServiceProvider.defaults = {
      'default': 'mm'
    };
    gravatarServiceProvider.secure = true;
  }
]);
