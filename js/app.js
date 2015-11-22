'use strict';

angular.module('uchiwa', [
  'uchiwa.controllers',
  'uchiwa.constants',
  'uchiwa.directives',
  'uchiwa.factories',
  'uchiwa.filters',
  'uchiwa.providers',
  'uchiwa.services',
  // Angular dependencies
  'ngCookies',
  'ngRoute',
  'ngSanitize',
  // 3rd party dependencies
  'angularMoment',
  'toastr',
  'ui.bootstrap',
  'ui.gravatar'
]);

angular.module('uchiwa')
.config(['$httpProvider', '$routeProvider', '$tooltipProvider',
  function ($httpProvider, $routeProvider, $tooltipProvider) {
    // Token injection
    $httpProvider.interceptors.push('authInterceptor');

    // Routing
    $routeProvider
      .when('/', {redirectTo: function () {
        return '/events';
      }})
      .when('/aggregate/:dc/:check', {templateUrl: 'bower_components/uchiwa-web/partials/views/aggregate.html', reloadOnSearch: false, controller: 'AggregateController'})
      .when('/aggregates', {templateUrl: 'bower_components/uchiwa-web/partials/views/aggregates.html', reloadOnSearch: false, controller: 'AggregatesController'})
      .when('/checks', {templateUrl: 'bower_components/uchiwa-web/partials/views/checks.html', reloadOnSearch: false, controller: 'ChecksController'})
      .when('/client/:dc/:client', {templateUrl: 'bower_components/uchiwa-web/partials/views/client.html', reloadOnSearch: false, controller: 'ClientController'})
      .when('/clients', {templateUrl: 'bower_components/uchiwa-web/partials/views/clients.html', reloadOnSearch: false, controller: 'ClientsController'})
      .when('/datacenters', {templateUrl: 'bower_components/uchiwa-web/partials/views/datacenters.html', controller: 'DatacentersController'})
      .when('/events', {templateUrl: 'bower_components/uchiwa-web/partials/views/events.html', reloadOnSearch: false, controller: 'EventsController'})
      .when('/info', {templateUrl: 'bower_components/uchiwa-web/partials/views/info.html', controller: 'InfoController'})
      .when('/login', {templateUrl: 'bower_components/uchiwa-web/partials/login/index.html', controller: 'LoginController'})
      .when('/settings', {templateUrl: 'bower_components/uchiwa-web/partials/views/settings.html', controller: 'SettingsController'})
      .when('/stashes', {templateUrl: 'bower_components/uchiwa-web/partials/views/stashes.html', reloadOnSearch: false, controller: 'StashesController'})
      .otherwise('/');

    $tooltipProvider.options({animation: false, 'placement': 'bottom'});
  }
])
.run(function (backendService, conf, themes, $cookieStore, $location, notification, $rootScope, titleFactory) {
  $rootScope.alerts = [];
  $rootScope.events = [];
  $rootScope.partialsPath = 'bower_components/uchiwa-web/partials';
  $rootScope.skipOneRefresh = false;
  $rootScope.showCollectionBar = true;
  $rootScope.enterprise = conf.enterprise;
  $rootScope.themes = themes;

  $rootScope.titleFactory = titleFactory;

  backendService.getConfig();

  // fetch the sensu data on every page change
  $rootScope.$on('$routeChangeSuccess', function () {
    $rootScope.auth = $cookieStore.get('uchiwa_auth') || false;
    backendService.getDatacenters();
  });

  $rootScope.$on('notification', function (event, type, message) {
    if ($location.path() !== '/login') {
      notification(type, message);
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
