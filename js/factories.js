'use strict';

var factoryModule = angular.module('uchiwa.factories', []);

factoryModule.factory('audit', function ($http, $rootScope) {
  return {
    log: function (payload) {
      if (!$rootScope.auth) {
        return;
      }
      return $http.post('audit', payload);
    }
  };
});

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
          $location.path('/login');
          $location.url($location.path());
        }
      }
      return $q.reject(rejection);
    }
  };
});

/**
* Sensu Data
*/
factoryModule.factory('Sensu', function(backendService, conf, $interval, $rootScope) {
  var sensu = {aggregates: [], checks: [], client: {}, clients: [], events: [], stashes: [], subscriptions: []};

  return {
    getAggregates: function() {
      return sensu.aggregates;
    },
    getChecks: function() {
      return sensu.checks;
    },
    getClient: function() {
      return sensu.client;
    },
    getClients: function() {
      return sensu.clients;
    },
    getEvents: function() {
      return sensu.events;
    },
    getStashes: function() {
      return sensu.stashes;
    },
    getSubscriptions: function() {
      return sensu.subscriptions;
    },
    stop: function(timer) {
      $interval.cancel(timer);
    },
    updateAggregates: function() {
      var update = function() {
        backendService.getHealth();
        backendService.getMetrics();
        backendService.getAggregates()
          .success(function (data) {
            sensu.aggregates = data;
          })
          .error(function(error) {
            if (error !== null) {
              console.error(JSON.stringify(error));
            }
          });
      };
      update();
      return $interval(update, conf.refresh);
    },
    updateChecks: function() {
      var update = function() {
        backendService.getHealth();
        backendService.getMetrics();
        backendService.getChecks()
          .success(function (data) {
            sensu.checks = data;
          })
          .error(function(error) {
            if (error !== null) {
              console.error(JSON.stringify(error));
            }
          });
      };
      update();
      return $interval(update, conf.refresh);
    },
    updateClient: function(client, dc) {
      var update = function() {
        backendService.getHealth();
        backendService.getMetrics();
        if ($rootScope.skipOneRefresh) {
          $rootScope.skipOneRefresh = false;
          return;
        }
        backendService.getClient(client, dc)
          .success(function (data) {
            sensu.client = data;
          })
          .error(function(error) {
            sensu.client = null;
            if (error !== null) {
              console.error(JSON.stringify(error));
            }
          });
      };
      update();
      return $interval(update, conf.refresh);
    },
    updateClients: function() {
      var update = function() {
        backendService.getHealth();
        backendService.getMetrics();
        if ($rootScope.skipOneRefresh) {
          $rootScope.skipOneRefresh = false;
          return;
        }
        backendService.getClients()
          .success(function (data) {
            sensu.clients = data;
          })
          .error(function(error) {
            if (error !== null) {
              console.error(JSON.stringify(error));
            }
          });
      };
      update();
      return $interval(update, conf.refresh);
    },
    updateDashboard: function() {
      var update = function() {
        backendService.getHealth();
        backendService.getMetrics();
      };
      update();
      return $interval(update, conf.refresh);
    },
    updateEvents: function() {
      var update = function() {
        backendService.getHealth();
        backendService.getMetrics();
        if ($rootScope.skipOneRefresh) {
          $rootScope.skipOneRefresh = false;
          return;
        }
        backendService.getEvents()
          .success(function (data) {
            sensu.events = data;
          })
          .error(function(error) {
            if (error !== null) {
              console.error(JSON.stringify(error));
            }
          });
      };
      update();
      return $interval(update, conf.refresh);
    },
    updateMetrics: function() {
      var update = function() {
        backendService.getHealth();
        backendService.getMetrics();
      };
      update();
      return $interval(update, conf.refresh);
    },
    updateStashes: function() {
      var update = function() {
        backendService.getHealth();
        backendService.getMetrics();
        if ($rootScope.skipOneRefresh) {
          $rootScope.skipOneRefresh = false;
          return;
        }
        backendService.getStashes()
          .success(function (data) {
            sensu.stashes = data;
          })
          .error(function(error) {
            if (error !== null) {
              console.error(JSON.stringify(error));
            }
          });
      };
      update();
      return $interval(update, conf.refresh);
    },
    updateSubscriptions: function() {
      backendService.getSubscriptions()
        .success(function (data) {
          sensu.subscriptions = data;
        })
        .error(function(error) {
          if (error !== null) {
            console.error(JSON.stringify(error));
          }
        });
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
