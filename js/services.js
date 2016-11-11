'use strict';

var serviceModule = angular.module('uchiwa.services', []);

/**
* Aggregates Service
*/
serviceModule.service('Aggregates', ['Helpers', 'Notification', '$q', '$resource', '$rootScope',
  function (Helpers, Notification, $q, $resource, $rootScope) {
    var Aggregates = $resource('/aggregates/:name/:members/:severity',
      {name: '@name', members: '@members', severity: '@severity'}
    );
    var self = this;
    this.delete = function(id) {
      var attributes = Helpers.splitId(id);
      return Aggregates.delete({name: attributes[1], dc: attributes[0]}).$promise;
    };
    this.deleteMultiple = function(filtered, selected) {
      return Helpers.deleteMultiple(self.delete, filtered, selected)
      .then(
        function(result) {
          Notification.success('The aggregates have been deleted');
          return result;
        },
        function() {
          Notification.error('Could not delete all of the aggregates');
          return $q.reject();
        }
      );
    };
    this.deleteSingle = function(id) {
      return self.delete(id)
      .then(
        function() {
          $rootScope.skipOneRefresh = true;
          Notification.success('The aggregate '+ id +' has been deleted');
        },
        function(error) {
          Notification.error('Could not delete the aggregate '+ id);
          return $q.reject(error);
        }
      );
    };
  }
]);

/**
* Backend Service
*/
serviceModule.service('backendService', ['audit', 'conf', '$http', '$interval', '$location', '$rootScope',
  function(audit, conf, $http, $interval, $location, $rootScope){
    var errorRefresh = conf.appName+' is having trouble updating its data. Try to refresh the page if this issue persists.';

    this.auth = function() {
      return $http.get('auth');
    };
    this.getAggregate = function(name, dc) {
      return $http.get('aggregates/'+name+'?dc='+dc);
    };
    this.getAggregateMembers = function(name, type, dc) {
      return $http.get('aggregates/'+name+'/'+type+'?dc='+dc);
    };
    this.getAggregateResults = function(name, severity, dc) {
      return $http.get('aggregates/'+name+'/results/'+severity+'?dc='+dc);
    };
    this.getAggregates = function() {
      return $http.get('aggregates');
    };
    this.getChecks = function() {
      return $http.get('checks');
    };
    this.getClient = function(client, dc) {
      return $http.get('clients/'+client+'?dc='+dc);
    };
    this.getClientHistory = function(client, dc) {
      return $http.get('clients/'+client+'/history?dc='+dc);
    };
    this.getClients = function() {
      return $http.get('clients');
    };
    this.getConfig = function() {
      if ($location.path().substring(0, 6) === '/login') {
        return;
      }
      $http.get('config')
        .success(function (data) {
          $rootScope.config = data;
          conf.refresh = data.Uchiwa.Refresh * 1000;
        })
        .error(function(error) {
          $rootScope.$emit('notification', 'error', errorRefresh);
          if (error !== null) {
            console.error(JSON.stringify(error));
          }
        });
    };
    this.getConfigAuth = function () {
      return $http.get('config/auth');
    };
    this.getDatacenters = function() {
      $http.get('datacenters')
        .success(function(data) {
          if (!angular.isObject(data)) {
            $rootScope.datacenters = [];
          }
          else {
            $rootScope.datacenters = data;
          }
        })
        .error(function(error) {
          $rootScope.$emit('notification', 'error', errorRefresh);
          if (error !== null) {
            console.error(JSON.stringify(error));
          }
        });
    };
    this.getEvents = function () {
      return $http.get('events');
    };
    this.getHealth = function() {
      return $http.get('health');
    };
    this.getMetrics = function() {
      return $http.get('metrics');
    };
    this.getSEMetrics = function(endpoint) {
      return $http.get('metrics/'+endpoint);
    };
    this.getSilenced = function() {
      return $http.get('silenced');
    };
    this.getStashes = function() {
      return $http.get('stashes');
    };
    this.getSubscriptions = function() {
      return $http.get('subscriptions');
    };
    this.login = function(payload) {
      return $http.post('login', payload);
    };
  }
]);

/**
* Checks Services
*/
serviceModule.service('Checks', ['Helpers', 'Notification', '$q', '$resource', 'Silenced',
function (Helpers, Notification, $q, $resource, Silenced) {
  var Request = $resource('/request', null,
    {'publish': {method: 'POST'}}
  );
  this.issueCheckRequest = function(dc, name, subscribers) {
    var request = new Request({check: name, dc: dc, subscribers: subscribers});
    return request.$publish();
  };
  this.issueMulipleCheckRequest = function(filtered, selected) {
    var self = this;
    var promises = [];
    var toIssue = Helpers.getSelected(filtered, selected);

    angular.forEach(toIssue, function(item) {
      promises.push(self.issueCheckRequest(item.dc, item.name, item.subscribers));
    });

    $q.all(promises).then(
    function() {
      if (promises.length === 1) {
        Notification.success('The check request for '+ toIssue[0].name +' has been issued');
        return;
      }
      Notification.success(promises.length + ' check requests have been issued');
    },
    function () {
      if (promises.length === 1) {
        Notification.error('Could not issue the check request '+ toIssue[0].name);
        return;
      }
      Notification.error('Could not issue all check requests');
    });
  };
  this.silence = function(filtered, selected) {
    var itemsToSilence = Helpers.getSelected(filtered, selected);
    Silenced.create(null, itemsToSilence);
  };
}]);

/**
* Clients Services
*/
serviceModule.service('Clients', ['Events', '$filter', 'Helpers', '$location', 'Notification', '$q', '$resource', 'Results', '$rootScope', 'Silenced',
function (Events, $filter, Helpers, $location, Notification, $q, $resource, Results, $rootScope, Silenced) {
  var Clients = $resource('/clients/:name/:history',
    {name: '@name', history: '@history'}
  );
  var self = this;
  this.delete = function(id) {
    var attributes = Helpers.splitId(id);
    return Clients.delete({name: attributes[1], dc: attributes[0]}).$promise;
  };
  this.deleteCheckResult = function(id) {
    return Results.delete(id);
  };
  this.deleteMultiple = function(filtered, selected) {
    return Helpers.deleteMultiple(self.delete, filtered, selected).
    then(
      function(result) {
        Notification.success('The clients have been deleted');
        return result;
      },
      function() {
        Notification.error('Could not delete all of the clients');
        return $q.reject();
      }
    );
  };
  this.deleteSingle = function(id) {
    return self.delete(id)
    .then(
      function() {
        $rootScope.skipOneRefresh = true;
        Notification.success('The client '+ id +' has been deleted');
      },
      function(error) {
        Notification.error('Could not delete the client '+ id);
        return $q.reject(error);
      }
    );
  };
  // findCheckHistory returns a specific check from the client's history
  this.findCheckHistory = function(history, name) {
    var deferred = $q.defer();
    if (angular.isUndefined(history) || angular.isUndefined(name)) {
      deferred.reject();
    }
    else {
      deferred.resolve(history.filter(function(item) {
        return item.check === name;
      })[0]);
    }
    return deferred.promise;
  };
  // findPanels extracts iframes & images from the lastResult hash to their own hash
  this.findPanels = function(lastResult) {
    if (angular.isUndefined(lastResult) || lastResult === null) {
      return $q.reject();
    }
    var promises = {};
    angular.forEach(lastResult, function(value, key) {
      // Issue 558: do not move an image from the command attribute to its own box
      if (key === 'command') {
        return true;
      }
      if (/<img src=/.test(value) || /<span class="iframe">/.test(value)) {
        promises[key] = value;
        delete lastResult[key];
      }
    });
    return $q.all(promises);
  };
  this.resolveEvent = function(id) {
    return Events.resolveSingle(id);
  };
  // richOutput applies rich HTML to the lastResult attributes
  this.richOutput = function(lastResult) {
    if (angular.isUndefined(lastResult) || lastResult === null) {
      return $q.reject();
    }
    var promises = {};
    angular.forEach(lastResult, function(value, key) {
      promises[key] = $filter('richOutput')(value);
    });
    return $q.all(promises);
  };
  this.silence = function(filtered, selected) {
    var itemsToSilence = Helpers.getSelected(filtered, selected);
    Silenced.create(null, itemsToSilence);
  };
}]);

/**
* Events
*/
serviceModule.service('Events', ['Helpers', 'Notification', '$q', '$resource', '$rootScope', 'Silenced',
function(Helpers, Notification, $q, $resource, $rootScope, Silenced) {
  var Events = $resource('/events/:client/:check',
    {check: '@check', client: '@client'}
  );
  var self = this;
  this.resolve = function(id) {
    var attributes = Helpers.splitId(id);
    var variables = Helpers.splitId(attributes[1]);
    return Events.delete({check: variables[1], client: variables[0], dc: attributes[0]}).$promise;
  };
  this.resolveMultiple = function(filtered, selected) {
    return Helpers.deleteMultiple(self.resolve, filtered, selected)
    .then(
      function(result) {
        Notification.success('The events have been resolved');
        return result;
      },
      function() {
        Notification.error('Could not resolve all of the events');
        return $q.reject();
      }
    );
  };
  this.resolveSingle = function(id) {
    return self.resolve(id)
    .then(
      function() {
        $rootScope.skipOneRefresh = true;
        Notification.success('The event '+ id +' has been resolved');
      },
      function(error) {
        Notification.error('Could not resolve the event '+ id);
        return $q.reject(error);
      }
    );
  };
  this.silence = function(filtered, selected) {
    var itemsToSilence = Helpers.getSelected(filtered, selected);
    Silenced.create(null, itemsToSilence);
  };
}]);

/**
* Results
*/
serviceModule.service('Results', ['Helpers', 'Notification', '$q', '$resource', '$rootScope',
function(Helpers, Notification, $q, $resource, $rootScope) {
  var Results = $resource('/results/:client/:check',
    {check: '@check', client: '@client'}
  );
  this.delete = function(id) {
    var attributes = Helpers.splitId(id);
    var variables = Helpers.splitId(attributes[1]);
    return Results.delete({check: variables[1], client: variables[0], dc: attributes[0]})
    .$promise.then(
      function() {
        $rootScope.skipOneRefresh = true;
        Notification.success('The check result '+ id +' has been deleted');
      },
      function(error) {
        Notification.error('Could not delete the check result '+ id);
        return $q.reject(error);
      }
    );
  };
}]);

/**
* Routing
*/
serviceModule.service('routingService', ['$location', function ($location) {
  var filtersDefaultValues = {
    'limit': 50
  };
  this.go = function (path) {
    if (window.getSelection().toString() === '') {
      path = encodeURI(path);
      $location.url(path);
    }
  };
  this.deleteEmptyParameter = function (routeParams, key) {
    if (routeParams[key] === '') {
      delete $location.$$search[key];
      $location.$$compose();
    }
  };
  this.initFilters = function (routeParams, filters, possibleFilters) {
    var self = this;
    angular.forEach(possibleFilters, function (key) {
      if (angular.isDefined(routeParams[key])) {
        self.updateValue(filters, routeParams[key], key);
        self.deleteEmptyParameter(routeParams, key);
      }
      else {
        self.updateValue(filters, '', key);
      }
    });
  };
  this.permalink = function (e, key, value) {
    $location.search(key, value);
  };
  this.updateFilters = function (routeParams, filters) {
    var self = this;
    angular.forEach(routeParams, function (value, key) {
      self.updateValue(filters, value, key);
      self.deleteEmptyParameter(routeParams, key);
    });
  };
  this.updateValue = function (filters, value, key) {
    if (key === 'limit' && value === '0') {
      filters[key] = undefined;
      return;
    }
    if (value === '') {
      filters[key] = filtersDefaultValues[key] ? filtersDefaultValues[key] : value;
    }
    else {
      filters[key] = value;
    }
  };
}]);

/**
* Sidebar
*/
serviceModule.service('Sidebar', function () {
  this.getAlerts = function(health) {
    var alerts = [];
    if (angular.isDefined(health) && angular.isObject(health)) {
      if (angular.isObject(health.sensu)) {
        angular.forEach(health.sensu, function(value, key) {
          if (value.status !== 0) {
            alerts.push('Datacenter <strong>' + key + '</strong> returned: <em>' + value.output + '</em>');
          }
        });
      } else {
        alerts.push(health.uchiwa);
      }

    } else {
      console.error('Unexpected health object: ' + JSON.stringify(health));
    }
    return alerts;
  };
});

/**
* Silenced
*/
serviceModule.service('Silenced', ['Helpers', 'Notification', '$q', '$resource', '$rootScope', '$uibModal',
  function (Helpers, Notification, $q, $resource, $rootScope, $uibModal) {
    var Silenced = $resource('/silenced/:action/:name',
      {action: '@action', name: '@name'},
      {'clear': {method: 'POST'}, 'create': {method: 'POST'}}
    );
    var self = this;
    this.clearEntries = function(entries) {
      var promises = [];

      angular.forEach(entries, function(entry) {
        if (entry.selected) {
          promises.push(self.delete(entry._id));
        }
      });
      return $q.all(promises);
    };
    this.create = function (e, i) {
      var items = _.isArray(i) ? i : new Array(i);
      var event = e || window.event;
      if (angular.isDefined(event)) {
        event.stopPropagation();
      }
      if (items.length === 0) {
        $rootScope.$emit('notification', 'error', 'No items selected');
      } else {
        var modalInstance = $uibModal.open({ // jshint ignore:line
          templateUrl: $rootScope.partialsPath + '/modals/silenced.html',
          controller: 'SilencedModalController',
          resolve: {
            items: function () {
              return items;
            }
          }
        });
      }
    };
    this.createEntries = function(items, itemType, options) {
      var promises = [];

      if (itemType === 'subscription') {
        items.push({dc: options.ac.dc, silenced: false, subscription: options.ac.subscription});
      }
      angular.forEach(items, function(item) {
        if (angular.isObject(item) && !item.silenced) {
          var payload = {dc: item.dc};
          if (angular.isDefined(options.expire_on_resolve)) { // jshint ignore:line
            payload.expire_on_resolve = options.expire_on_resolve; // jshint ignore:line
          }
          if (angular.isDefined(options.reason)) {
            payload.reason = options.reason;
          }
          if (options.expire === 'custom') {
            var now = new Date().getTime();
            payload.expire = Helpers.secondsBetweenDates(now, options.to);
          } else if (options.expire > 0) {
            payload.expire = options.expire;
          }

          // Determine the subscription
          if (itemType === 'client') {
            payload.subscription = 'client:' + item.name;
          } else if (itemType === 'subscription') {
            payload.subscription = item.subscription;
          } else {
            if (angular.isDefined(item.client)) {
              payload.subscription = 'client:';
              payload.subscription += item.client.name || item.client;
            }
            if (angular.isDefined(item.check)) {
              payload.check = item.check.name || item.check;
            } else {
              payload.check = item.name;
            }
          }
          promises.push(self.post(payload));
        }
      });
      return $q.all(promises);
    };
    this.delete = function(id) {
      var attributes = Helpers.splitId(id);
      var entry = new Silenced({dc: attributes[0], id: attributes[1]});
      return entry.$clear({action: 'clear'});
    };
    this.deleteSingle = function(id) {
      return self.delete(id)
      .then(
        function() {
          $rootScope.skipOneRefresh = true;
          Notification.success('The silence entry '+ id +' has been cleared');
        },
        function(error) {
          Notification.error('Could not clear the silence entry '+ id);
          return $q.reject(error);
        }
      );
    };
    this.deleteMultiple = function(filtered, selected) {
      return Helpers.deleteMultiple(self.delete, filtered, selected)
      .then(
        function(result) {
          Notification.success('The silence entries have been cleared');
          return result;
        },
        function() {
          Notification.error('Could not clear all of the silence entries');
          return $q.reject();
        }
      );
    };
    this.findEntriesFromItems = function(entries, items) {
      var foundEntries = [];
      angular.forEach(items, function(item) {
        // If the item does not have a silenced attribute, set it to false
        if (angular.isDefined(item) && angular.isUndefined(item.silenced)) {
          item.silenced = false;
          return;
        }
        // Is the item silenced?
        if (angular.isDefined(item) && item.silenced) {
          // Do we have a client?
          if (angular.isUndefined(item.silenced_by)) { // jshint ignore:line
            item.silenced_by = ['client:' + item.name + ':*']; // jshint ignore:line
          }
          angular.forEach(item.silenced_by, function(id){ // jshint ignore:line
            var _id = item.dc + ':' + id;
            // Make sure we don't already have the entry
            if (Helpers.findIdInItems(_id, foundEntries) === null) {
              var entry = Helpers.findIdInItems(_id, entries);
              if (entry !== null) {
                entry.selected = true;
                foundEntries.push(entry);
              }
            }
          });
        }
      });
      return foundEntries;
    };
    this.post = function(payload) {
      var entry = new Silenced(payload);
      return entry.$create();
    };
    this.query = function() {
      return Silenced.query();
    };
}]);

/**
* Stashes
*/
serviceModule.service('Stashes', ['Helpers', 'Notification', '$q', '$resource', '$rootScope',
  function (Helpers, Notification, $q, $resource, $rootScope) {
    var Stashes = $resource('/stashes/:path', {path: '@action'});
    var self = this;
    this.delete = function(id) {
      var attributes = Helpers.splitId(id);
      return Stashes.delete({path: attributes[1], dc: attributes[0]}).$promise;
    };
    this.deleteMultiple = function(filtered, selected) {
      return Helpers.deleteMultiple(self.delete, filtered, selected)
      .then(
        function(result) {
          Notification.success('The stashes have been deleted');
          return result;
        },
        function() {
          Notification.error('Could not delete all of the stashes');
          return $q.reject();
        }
      );
    };
    this.deleteSingle = function(id) {
      return self.delete(id)
      .then(
        function() {
          $rootScope.skipOneRefresh = true;
          Notification.success('The stash '+ id +' has been deleted');
        },
        function(error) {
          Notification.error('Could not delete the stash '+ id);
          return $q.reject(error);
        }
      );
    };
    this.get = function(stashes, id) {
      for (var i = 0, len = stashes.length; i < len; i++) {
        if (angular.isObject(stashes[i]) && angular.isDefined(stashes[i]._id)) {
          if (stashes[i]._id === id) {
            return stashes[i];
          }
        }
      }
      return null;
    };
}]);

/**
* Subscriptions
*/
serviceModule.service('Subscriptions', ['$resource',
  function ($resource) {
    var Subscriptions = $resource('/subscriptions');
    this.query = function() {
      return Subscriptions.query();
    };
}]);

/**
* User service
*/
serviceModule.service('userService', ['$cookieStore', '$location', '$rootScope',
function ($cookieStore, $location, $rootScope) {
  this.getUsername = function () {
    if ($rootScope.auth && $rootScope.username) {
      return $rootScope.auth.username;
    }
    return '';
  };
  this.isReadOnly = function () {
    if ($rootScope.auth && $rootScope.auth.Role && angular.isDefined($rootScope.auth.Role.Readonly)) {
      return $rootScope.auth.Role.Readonly;
    }
    return false;
  };
  this.isAdmin = function () {
    return false;
  };
  this.logout = function () {
    $cookieStore.remove('uchiwa_auth');
    $rootScope.auth = false;
    $rootScope.config = false;
    $location.path('login');
  };
}]);
