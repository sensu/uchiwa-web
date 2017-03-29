'use strict';

var factoryModule = angular.module('uchiwa.factories', []);

factoryModule.factory('authInterceptor', function ($cookieStore, $q, $location) {
  return {
    responseError: function (rejection) {
      if (rejection.status === 401) {
        // handle the case where the user is not authenticated
        if ($location.path() !== '/login') {
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
factoryModule.factory('Sensu', function(backendService, Config, $interval, Notification, $q, $rootScope) {
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

  var errorMessage = 'Unable to connect to '+ Config.appName() +'. Check your connectivity and refresh this page.';

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
          .then(function (response) {
            sensu.aggregate = response.data;
          }, function(error) {
            if (error !== null) {
              sensu.aggregate = null;
              console.error(JSON.stringify(error));
            }
          });
      };
      update();
      return $interval(update, Config.refresh());
    },
    updateAggregateChecks: function(name, dc) {
      var update = function() {
        backendService.getAggregateMembers(name, 'checks', dc)
          .then(function (response) {
            sensu.aggregateChecks = response.data;
          }, function(error) {
            if (error !== null) {
              console.error(JSON.stringify(error));
            }
          });
      };
      update();
      return $interval(update, Config.refresh());
    },
    updateAggregateClients: function(name, dc) {
      var update = function() {
        backendService.getAggregateMembers(name, 'clients', dc)
          .then(function (response) {
            sensu.aggregateClients = response.data;
          }, function(error) {
            if (error !== null) {
              console.error(JSON.stringify(error));
            }
          });
      };
      update();
      return $interval(update, Config.refresh());
    },
    updateAggregateResults: function(name, severity, dc) {
      var update = function() {
        backendService.getAggregateResults(name, severity, dc)
          .then(function (response) {
            sensu.aggregateResults = response.data;
          }, function(error) {
            if (error !== null) {
              console.error(JSON.stringify(error));
            }
          });
      };
      update();
      return $interval(update, Config.refresh());
    },
    updateAggregates: function() {
      var update = function() {
        backendService.getAggregates()
          .then(function (response) {
            sensu.aggregates = response.data;
          }, function(error) {
            if (error !== null) {
              console.error(JSON.stringify(error));
            }
          });
      };
      update();
      return $interval(update, Config.refresh());
    },
    updateChecks: function() {
      var update = function() {
        backendService.getChecks()
          .then(function (response) {
            sensu.checks = response.data;
          }, function(error) {
            if (error !== null) {
              console.error(JSON.stringify(error));
            }
          });
      };
      update();
      return $interval(update, Config.refresh());
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
      return $interval(update, Config.refresh());
    },
    updateClients: function() {
      var update = function() {
        if ($rootScope.skipOneRefresh) {
          $rootScope.skipOneRefresh = false;
          return;
        }
        backendService.getClients()
          .then(function (response) {
            sensu.clients = response.data;
          }, function(error) {
            if (error !== null) {
              console.error(JSON.stringify(error));
            }
          });
      };
      update();
      return $interval(update, Config.refresh());
    },
    updateEvents: function() {
      var update = function() {
        if ($rootScope.skipOneRefresh) {
          $rootScope.skipOneRefresh = false;
          return;
        }
        backendService.getEvents()
          .then(function (response) {
            sensu.events = response.data;
          }, function(error) {
            if (error !== null) {
              console.error(JSON.stringify(error));
            }
          });
      };
      update();
      return $interval(update, Config.refresh());
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
            sensu.health = {uchiwa: errorMessage};
          }
        );
      };
      update();
      return $interval(update, Config.refresh());
    },
    updateMetrics: function() {
      var update = function() {
        backendService.getMetrics()
        .then(
          function(result) {
            sensu.metrics = result.data;
          },
          function() {
            Notification.error(errorMessage);
          }
        );
      };
      update();
      return $interval(update, Config.refresh());
    },
    updateSilenced: function() {
      var update = function() {
        if ($rootScope.skipOneRefresh) {
          $rootScope.skipOneRefresh = false;
          return;
        }
        backendService.getSilenced()
          .then(function (response) {
            sensu.silenced = response.data;
          }, function(error) {
            if (error !== null) {
              console.error(JSON.stringify(error));
            }
          });
      };
      update();
      return $interval(update, Config.refresh());
    },
    updateStashes: function() {
      var update = function() {
        if ($rootScope.skipOneRefresh) {
          $rootScope.skipOneRefresh = false;
          return;
        }
        backendService.getStashes()
          .then(function (response) {
            sensu.stashes = response.data;
          }, function(error) {
            if (error !== null) {
              console.error(JSON.stringify(error));
            }
          });
      };
      update();
      return $interval(update, Config.refresh());
    },
    updateSubscriptions: function() {
      backendService.getSubscriptions()
        .then(function (response) {
          sensu.subscriptions = response.data;
        }, function(error) {
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
