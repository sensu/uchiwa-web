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
.config(['$httpProvider', '$routeProvider', 'toastrConfig', '$uibTooltipProvider',
  function ($httpProvider, $routeProvider, toastrConfig, $uibTooltipProvider) {
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
      .when('/aggregates/:dc/:name/:members?/:severity?', {templateUrl: 'bower_components/uchiwa-web/partials/views/aggregate.html', reloadOnSearch: false, controller: 'AggregateController'})
      .when('/aggregates', {templateUrl: 'bower_components/uchiwa-web/partials/views/aggregates.html', reloadOnSearch: false, controller: 'AggregatesController'})
      .when('/checks', {templateUrl: 'bower_components/uchiwa-web/partials/views/checks.html', reloadOnSearch: false, controller: 'ChecksController'})
      .when('/client/:dc/:client', {templateUrl: 'bower_components/uchiwa-web/partials/views/client.html', reloadOnSearch: false, controller: 'ClientController'})
      .when('/clients', {templateUrl: 'bower_components/uchiwa-web/partials/views/clients.html', reloadOnSearch: false, controller: 'ClientsController'})
      .when('/datacenters', {templateUrl: 'bower_components/uchiwa-web/partials/views/datacenters.html', controller: 'DatacentersController'})
      .when('/datacenters/:id', {templateUrl: 'bower_components/uchiwa-web/partials/views/datacenter.html', controller: 'DatacenterController'})
      .when('/events', {templateUrl: 'bower_components/uchiwa-web/partials/views/events.html', reloadOnSearch: false, controller: 'EventsController'})
      .when('/info', {templateUrl: 'bower_components/uchiwa-web/partials/views/info.html', controller: 'InfoController'})
      .when('/login', {templateUrl: 'bower_components/uchiwa-web/partials/login/index.html', controller: 'LoginController'})
      .when('/settings', {templateUrl: 'bower_components/uchiwa-web/partials/views/settings.html', controller: 'SettingsController'})
      .when('/silenced', {templateUrl: 'bower_components/uchiwa-web/partials/views/silenced.html', reloadOnSearch: false, controller: 'SilencedController'})
      .when('/silenced/:id*', {templateUrl: 'bower_components/uchiwa-web/partials/views/silenced-entry.html', reloadOnSearch: false, controller: 'SilencedEntryController'})
      .when('/stashes', {templateUrl: 'bower_components/uchiwa-web/partials/views/stashes.html', reloadOnSearch: false, controller: 'StashesController'})
      .when('/stashes/:id*', {templateUrl: 'bower_components/uchiwa-web/partials/views/stash.html', reloadOnSearch: false, controller: 'StashController'})
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
.run(function (backendService, $cookieStore, $location, $rootScope, titleFactory) {
  $rootScope.partialsPath = 'bower_components/uchiwa-web/partials';
  $rootScope.skipOneRefresh = false;
  $rootScope.showCollectionBar = true;
  $rootScope.enterprise = false;
  $rootScope.isAuthenticated = angular.isDefined($cookieStore.get('user')) || false;
  $rootScope.titleFactory = titleFactory;

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
