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
  'toastr',
  'ui.bootstrap'
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
      .when('/login', {templateUrl: 'bower_components/uchiwa-web/partials/login/index.html', controller: 'login'})
      .when('/events', {templateUrl: 'bower_components/uchiwa-web/partials/views/events.html', reloadOnSearch: false, controller: 'events'})
      .when('/client/:dcId/:clientId', {templateUrl: 'bower_components/uchiwa-web/partials/views/client.html', reloadOnSearch: false, controller: 'client'})
      .when('/clients', {templateUrl: 'bower_components/uchiwa-web/partials/views/clients.html', reloadOnSearch: false, controller: 'clients'})
      .when('/checks', {templateUrl: 'bower_components/uchiwa-web/partials/views/checks.html', reloadOnSearch: false, controller: 'checks'})
      .when('/info', {templateUrl: 'bower_components/uchiwa-web/partials/views/info.html', controller: 'info'})
      .when('/stashes', {templateUrl: 'bower_components/uchiwa-web/partials/views/stashes.html', reloadOnSearch: false, controller: 'stashes'})
      .when('/settings', {templateUrl: 'bower_components/uchiwa-web/partials/views/settings.html', controller: 'settings'})
      .when('/aggregates', {templateUrl: 'bower_components/uchiwa-web/partials/views/aggregates.html', reloadOnSearch: false, controller: 'aggregates'})
      .when('/aggregate/:dcId/:checkId', {templateUrl: 'bower_components/uchiwa-web/partials/views/aggregate.html', reloadOnSearch: false, controller: 'aggregate'})
      .otherwise('/');
    $tooltipProvider.options({animation: false, 'placement': 'bottom'});
  }
])
.run(function (backendService, conf, themes, $cookieStore, $location, notification, $rootScope, titleFactory) {
  $rootScope.alerts = [];
  $rootScope.events = [];
  $rootScope.partialsPath = 'bower_components/uchiwa-web/partials';
  $rootScope.skipRefresh = false;
  $rootScope.enterprise = conf.enterprise;
  $rootScope.themes = themes;

  $rootScope.titleFactory = titleFactory;

  backendService.getConfig();

  // fetch the sensu data on every page change
  $rootScope.$on('$routeChangeSuccess', function () {
    backendService.update();
    $rootScope.auth = $cookieStore.get('uchiwa_auth') || false;
  });

  $rootScope.$on('notification', function (event, type, message) {
    if ($location.path() !== '/login') {
      notification(type, message);
      if (type === 'error') {
        console.error(type + ': '+ JSON.stringify(message));
      }
    }
  });
});
