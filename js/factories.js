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
factoryModule.factory('Sensu', function(backendService, conf, $interval, $q, $rootScope) {
  var sensu = {
    aggregate: null,
    aggregateChecks: [],
    aggregateClients: [],
    aggregateResults: [],
    aggregates: [],
    checks: [],
    client: {},
    clients: [],
    events: [],
    health: null,
    metrics: null,
    silenced: [],
    stashes: [],
    subscriptions: []
  };

  return {
    cleanAggregate: function() {
      sensu.aggregate = {};
    },
    cleanAggregateDetails: function() {
      sensu.aggregateChecks = [];
      sensu.aggregateClients = [];
      sensu.aggregateResults = [];
    },
    cleanClient: function() {
      sensu.client = {};
    },
    getAggregate: function() {
      return sensu.aggregate;
    },
    getAggregateChecks: function() {
      return sensu.aggregateChecks;
    },
    getAggregateClients: function() {
      return sensu.aggregateClients;
    },
    getAggregateResults: function() {
      return sensu.aggregateResults;
    },
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
    getHealth: function() {
        return sensu.health;
    },
    getMetrics: function() {
        return sensu.metrics;
    },
    getSilenced: function() {
      return sensu.silenced;
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
    updateAggregate: function(name, dc) {
      var update = function() {
        backendService.getAggregate(name, dc)
          .success(function (data) {
            sensu.aggregate = data;
          })
          .error(function(error) {
            if (error !== null) {
              sensu.aggregate = null;
              console.error(JSON.stringify(error));
            }
          });
      };
      update();
      return $interval(update, conf.refresh);
    },
    updateAggregateChecks: function(name, dc) {
      var update = function() {
        backendService.getAggregateMembers(name, 'checks', dc)
          .success(function (data) {
            sensu.aggregateChecks = data;
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
    updateAggregateClients: function(name, dc) {
      var update = function() {
        backendService.getAggregateMembers(name, 'clients', dc)
          .success(function (data) {
            sensu.aggregateClients = data;
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
    updateAggregateResults: function(name, severity, dc) {
      var update = function() {
        backendService.getAggregateResults(name, severity, dc)
          .success(function (data) {
            sensu.aggregateResults = data;
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
    updateAggregates: function() {
      var update = function() {
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
        if ($rootScope.skipOneRefresh) {
          $rootScope.skipOneRefresh = false;
          return;
        }
        $q.all([
          backendService.getClient(client, dc),
          backendService.getClientHistory(client, dc)
        ]).then(function(result){
          sensu.client = result[0].data;
          sensu.client.history = result[1].data;
        }, function(error) {
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
    updateEvents: function() {
      var update = function() {
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
    updateHealth: function() {
      var update = function() {
        backendService.getHealth()
        .then(
          function(result) {
            sensu.health = result.data;
          },
          function(result) {
            if (angular.isDefined(result.data) && result.data !== null) {
              sensu.health = result.data;
              return;
            }
            sensu.health = {uchiwa: 'Unable to connect to Uchiwa API. Check your connectivity or the Uchiwa service'};
          }
        );
      };
      update();
      return $interval(update, conf.refresh);
    },
    updateMetrics: function() {
      var update = function() {
        backendService.getMetrics()
        .then(
          function(result) {
            sensu.metrics = result.data;
          }
        );
      };
      update();
      return $interval(update, conf.refresh);
    },
    updateSilenced: function() {
      var update = function() {
        if ($rootScope.skipOneRefresh) {
          $rootScope.skipOneRefresh = false;
          return;
        }
        backendService.getSilenced()
          .success(function (data) {
            sensu.silenced = data;
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
    updateStashes: function() {
      var update = function() {
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
