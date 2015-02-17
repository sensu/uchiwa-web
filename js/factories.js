'use strict';

var factoryModule = angular.module('uchiwa.factories', []);

factoryModule.factory('authInterceptor', function ($cookieStore, $q, $location, userService) {
  return {
    request: function (config) {
      config.headers = config.headers || {};
      var user = $cookieStore.get('uchiwa_auth');
      var token = null;
      if (angular.isDefined(user)) {
        token = user.Token || null;
      }
      if (token) {
        config.headers.Authorization = 'Bearer ' + token;
      }
      return config;
    },
    responseError: function (rejection) {
      if (rejection.status === 401) {
        // handle the case where the user is not authenticated
        if ($location.path() !== '/login') {
          userService.logout();
          $location.path('login');
        }
      }
      return $q.reject(rejection);
    }
  };
});

/**
* Page title
*/
factoryModule.factory('titleFactory', function() {
  var title = 'Uchiwa';
  return {
    get: function() { return title + ' | Uchiwa'; },
    set: function(newTitle) { title = newTitle; }
  };
});

/**
* Underscore.js
*/
factoryModule.factory('underscore', function () {
  if (angular.isUndefined(window._)) {
    console.log('underscore.js is required');
  } else {
    return window._;
  }
});
