'use strict';

var factoryModule = angular.module('uchiwa.factories', []);

factoryModule.factory('authInterceptor', function ($cookieStore, $q, $location, $window) {
  return {
    request: function (config) {
      config.headers = config.headers || {};
      var token = $cookieStore.get('uchiwa_token');
      if (angular.isDefined(token)) {
        config.headers.Authorization = 'Bearer ' + token;
      }
      return config;
    },
    responseError: function (rejection) {
      if (rejection.status === 401 || rejection.status === 403) {
        // handle the case where the user is not authenticated
        if ($location.path() !== '/login') {
          $window.location.href = $window.location.protocol +'//'+$window.location.host +'/#/login';
          $window.location.reload();
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
