'use strict';

var serviceModule = angular.module('uchiwa.services', []);

/**
* Aggregates Service
*/
serviceModule.service('Aggregates', ['Helpers', 'Notification', '$q', '$resource', '$rootScope',
  function (Helpers, Notification, $q, $resource, $rootScope) {
    var Aggregates = $resource('aggregates/:name/:members/:severity',
      {name: '@name', members: '@members', severity: '@severity'}
    );
    var self = this;
    this.delete = function(id) {
      var attributes = Helpers.splitId(id);
      var name = Helpers.escapeDot(attributes[1]);

      return Aggregates.delete({name: name, dc: attributes[0]}).$promise;
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
serviceModule.service('backendService', ['$http', '$interval', '$location', '$rootScope',
  function($http, $interval, $location, $rootScope){
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
    this.getDatacenters = function() {
      $http.get('datacenters')
        .then(function(response) {
          if (!angular.isObject(response.data)) {
            $rootScope.datacenters = [];
          }
          else {
            $rootScope.datacenters = response.data;
          }
        }, function(error) {
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
* Check
*/
serviceModule.service('Check', ['Checks', 'Config', 'Helpers', '$interval', 'Notification', '$resource',
function(Checks, Config, Helpers, $interval, Notification, $resource) {
  this.check = {};
  var Resource = $resource('checks/:name', {name: '@name'});
  var self = this;
  var timer;

  this.get = function(dc, name) {
    name = Helpers.escapeDot(name);

    Resource.get({name: name, dc: dc})
    .$promise.then(function(data) {
      angular.copy(data, self.check);
    },
    function() {
      self.check = null;
    });
  };
  this.realTime = function(dc, name) {
    self.get(dc, name);
    timer = $interval(function() {
      self.get(dc, name);
    }, Config.refresh());
  };
  this.stop = function() {
    $interval.cancel(timer);
    self.check = {};
  };
  this.issueCheckRequest = function(dc, name, subscribers) {
    Checks.issueCheckRequest(dc, name, subscribers)
      .then(function() {
        Notification.success('The check request for '+ name +' has been issued');
        return;
      }, function() {
        Notification.error('Could not issue the check request '+ name);
        return;
      });
  };
}]);

/**
* Checks Services
*/
serviceModule.service('Checks', ['Helpers', 'Notification', '$q', '$resource', 'Silenced',
function (Helpers, Notification, $q, $resource, Silenced) {
  var Request = $resource('request', null,
    {'publish': {method: 'POST'}}
  );
  this.issueCheckRequest = function(dc, name, subscribers) {
    name = Helpers.escapeDot(name);

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
* Client Services
*/
serviceModule.service('Client', ['$resource',
function ($resource) {
  var Client = $resource('clients');
  this.update = function(payload) {
    var client = new Client(payload);
    return client.$save();
  };
}]);

/**
* Clients Services
*/
serviceModule.service('Clients', ['Events', '$filter', 'Helpers', '$location', 'Notification', '$q', '$resource', 'Results', '$rootScope', 'Silenced',
function (Events, $filter, Helpers, $location, Notification, $q, $resource, Results, $rootScope, Silenced) {
  var Clients = $resource('clients/:name/:history',
    {name: '@name', history: '@history'}
  );
  var self = this;
  this.delete = function(id) {
    var attributes = Helpers.splitId(id);
    var name = Helpers.escapeDot(attributes[1]);

    return Clients.delete({name: name, dc: attributes[0]}).$promise;
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
      // Do not run the richOutput filter on the status
      if (key === 'status') {
        promises[key] = value;
        return true;
      }
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
* Config Services
*/
serviceModule.service('Config', ['DefaultConfig', '$filter', '$resource', '$rootScope',
function(DefaultConfig, $filter, $resource, $rootScope) {
  var Config = $resource('config/:resource', {resource: '@resource'});
  var self = this;
  this.appName = function() {
    if (self.enterprise()) {
      return 'Sensu Enterprise Console';
    }
    return 'Uchiwa';
  };
  this.dateFormat = function() {
    return DefaultConfig.DateFormat;
  };
  this.defaultTheme = function() {
    if (self.enterprise()) {
      return DefaultConfig.DefaultTheme || 'sensu-enterprise';
    }
    return DefaultConfig.DefaultTheme;
  };
  this.disableNoExpiration = function() {
    return DefaultConfig.DisableNoExpiration;
  };
  this.enterprise = function() {
    return $rootScope.enterprise;
  };
  this.get = function() {
    return Config.get();
  };
  this.favicon = function() {
    var defaultFavicon = 'bower_components/uchiwa-web/favicon.ico';
    if (self.enterprise()){
      defaultFavicon = 'img/favicon.png';
    }

    return DefaultConfig.Favicon || defaultFavicon;
  };
  this.logoURL = function() {
    if (self.enterprise()) {
      return DefaultConfig.LogoURL || 'img/logo.png';
    }

    return DefaultConfig.LogoURL;
  };
  this.refresh = function() {
    return DefaultConfig.Refresh;
  };
  this.requireSilencingReason = function() {
    return DefaultConfig.RequireSilencingReason;
  };
  this.silenceDurations = function() {
    return $filter('orderBy')(DefaultConfig.SilenceDurations);
  };
  this.resource = Config;
}]);

/**
* Datacenter
*/
serviceModule.service('Datacenter', ['Config', '$interval', '$resource',
function(Config, $interval, $resource) {
  this.datacenter = {};
  var Resource = $resource('datacenters/:name', {name: '@name'});
  var self = this;
  var timer;

  this.get = function(name) {
    Resource.get({name: name})
    .$promise.then(function(data) {
      angular.copy(data, self.datacenter);
    },
    function() {
      self.datacenter = null;
    });
  };
  this.realTime = function(name) {
    self.get(name);
    timer = $interval(function() {
      self.get(name);
    }, Config.refresh());
  };
  this.stop = function() {
    $interval.cancel(timer);
    self.datacenter = {};
  };
}]);

/**
* Events
*/
serviceModule.service('Events', ['Helpers', 'Notification', '$q', '$resource', '$rootScope', 'Silenced',
function(Helpers, Notification, $q, $resource, $rootScope, Silenced) {
  var Events = $resource('events/:client/:check',
    {check: '@check', client: '@client'}
  );
  var self = this;
  this.resolve = function(id) {
    var attributes = Helpers.splitId(id);
    var variables = Helpers.splitId(attributes[1]);
    var check = Helpers.escapeDot(variables[1]);
    var client = Helpers.escapeDot(variables[0]);

    return Events.delete({check: check, client: client, dc: attributes[0]}).$promise;
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
* Login
*/
serviceModule.service('Login', ['$resource',
function($resource) {
  var Login = $resource('login');
  this.resource = Login;
}]);

/**
* Logout
*/
serviceModule.service('Logout', ['$cookieStore', '$location', '$resource', '$rootScope',
function($cookieStore, $location, $resource, $rootScope) {
  var Login = $resource('logout');
  var self = this;
  this.get = function() {
    return Login.get();
  };
  this.do = function() {
    $cookieStore.remove('user');
    $rootScope.isAuthenticated = false;
    self.get();
    $location.path('login');
  };
}]);

/**
* Results
*/
serviceModule.service('Results', ['Helpers', 'Notification', '$q', '$resource', '$rootScope',
function(Helpers, Notification, $q, $resource, $rootScope) {
  var Results = $resource('results/:client/:check',
    {check: '@check', client: '@client'}
  );
  this.delete = function(id) {
    var attributes = Helpers.splitId(id);
    var variables = Helpers.splitId(attributes[1]);
    var check = Helpers.escapeDot(variables[1]);
    var client = Helpers.escapeDot(variables[0]);

    return Results.delete({check: check, client: client, dc: attributes[0]})
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
    var Silenced = $resource('silenced/:action/:name',
      {action: '@action', name: '@name'},
      {'clear': {method: 'POST'}, 'create': {method: 'POST'}}
    );
    var self = this;
    this.addEntry = function(options) {
      var payload = {
        dc: options.datacenter,
        expire: options.expire,
        reason: options.reason
      };

      if (angular.isDefined(options.check) && options.check !== '') {
        payload.check = options.check;
      }
      if (angular.isDefined(options.subscription) && options.subscription !== '') {
        payload.subscription = options.subscription;
      }

      if (options.expireOnResolve === 'true') {
        payload.expire_on_resolve = true; // jshint ignore:line
      }

      if (options.expire === 'resolve') {
        payload.expire_on_resolve = true; // jshint ignore:line
        delete payload.expire;
      }

      if (options.start === 'custom') {
        payload.begin = options.begin;
      }

      return self.post(payload);
    };
    this.clearEntries = function(entries) {
      var promises = [];

      // Verify if removing the entries impact more than a single client
      var impactsMultipleClients = false;
      angular.forEach(entries, function(entry) {
        var idParts = entry._id.split(':');
        if (idParts[1] !== 'client') {
          impactsMultipleClients = true;
        }
      });

      // If we do impact more than 1 client, display the appropriate message in
      // the confirmation prompt
      if (impactsMultipleClients) {
        var msg = 'Removing this silencing entry will impact multiple clients. Do you really want to remove it?';
        if (entries.length > 1) {
          msg = 'Removing these silencing entries will impact multiple clients. Do you really want to remove them?';
        }
        if (!window.confirm(msg)) {
          return $q.reject();
        }
      }

      angular.forEach(entries, function(entry) {
        if (entry.selected) {
          promises.push(self.delete(entry._id));
        }
      });
      return $q.all(promises);
    };
    this.create = function (e, i) {
      var items = angular.isArray(i) ? i : new Array(i);
      var event = e || window.event;
      if (angular.isDefined(event)) {
        event.stopPropagation();
      }
      if (items.length === 0) {
        Notification.error('No items selected');
      } else {
        var modalInstance = $uibModal.open({ // jshint ignore:line
          templateUrl: $rootScope.partialsPath + '/modals/silenced/index.html' + $rootScope.versionParam,
          controller: 'SilencedModalController',
          resolve: {
            items: function () {
              return items;
            }
          }
        });
      }
    };
    this.delete = function(id) {
      var attributes = Helpers.splitId(id);
      var entry = new Silenced({dc: attributes[0], id: attributes[1]});
      return entry.$clear({action: 'clear'});
    };
    this.deleteSingle = function(id) {
      // Verify if this silenced entry applies to multiple clients
      var idParts = id.split(':');
      // The first part will be the datacenter, then we have the subscription
      if (idParts[1] !== 'client') {
        if (!window.confirm('Removing this silencing entry will impact multiple clients. Do you really want to remove it?')) {
          return $q.reject();
        }
      }

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
    // itemOptions returns custom options based on the item attributes
    this.itemOptions = function(item, type) {
      var options = {};
      options.datacenter = item.hasOwnProperty('dc') ? item.dc : undefined;

      // Are we silencing from an event?
      if (type === 'event') {
        // Define the check
        options.what = 'check';
        options.check = item.check.name || item.check;
      } else if (type === 'check') {
        // Define the check
        options.what = 'check';
        options.check = item.name;
      } else {
        // We are silencing a client
        options.what = 'checks';
      }

      // Define the client
      if (type === 'check') {
        options.who = 'clients';
      } else {
        options.who = 'client';
        if (angular.isDefined(item.client) && angular.isDefined(item.client.name)) {
          options.client = item.client.name;
        } else {
          options.client = item.name || item.client;
        }
      }

      return options;
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
    // itemType returns the type of an element to silence.
    // Possible return values are check, client or event
    this.itemType = function(items) {
      if (angular.isDefined(items[0])) {
        if (items[0].hasOwnProperty('version')) {
          return 'client';
        } else if (items[0].hasOwnProperty('action') || items[0].hasOwnProperty('history')) {
          return 'event';
        } else {
          return 'check';
        }
      } else {
        return 'new';
      }
    };
    this.post = function(payload) {
      var entry = new Silenced(payload);
      return entry.$create();
    };
    this.query = function() {
      return Silenced.query();
    };
    // validate takes the options selected by the user and returns validated
    // options that can be directly sent to the backend
    this.validate = function(options) {
      // Remove the check attribute if we are silencing all checks
      if (options.what === 'checks') {
        delete options.check;
      }

      // Add the proper client subscription or remove the subscription attribute
      // if we are silencing all clients
      if (options.who === 'client') {
        options.subscription = 'client:' + options.client;
      } else if (options.who === 'clients') {
        delete options.subscription;
      }

      // Set the proper value to expire based on the option selected
      if (options.expire === 'custom') {
        var now = new Date().getTime();
        options.expire = Helpers.secondsBetweenDates(now, options.to);
      } else if (options.expire === 'duration') {
        options.expire = moment.duration(options.duration, options.durationFormat).asSeconds();
      } else if (options.expire === '-1') {
        delete options.expire;
      }

      // Set the beginning timestamp as unix timestamp if provided
      if (options.start === 'custom') {
        options.begin = moment(options.begin).unix();
      }

      return options;
    };
}]);

/**
* Stashes
*/
serviceModule.service('Stashes', ['Helpers', 'Notification', '$q', '$resource', '$rootScope',
  function (Helpers, Notification, $q, $resource, $rootScope) {
    var Stashes = $resource('stashes/:path', {path: '@action'});
    var self = this;
    this.create = function(payload) {
      var stash = new Stashes(payload);
      return stash.$save();
    };
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
serviceModule.service('Subscriptions', ['Helpers', '$resource',
  function (Helpers, $resource) {
    var Subscriptions = $resource('subscriptions/:subscription',
      {subscription: '@subscription'}
    );
    this.get = function(name) {
      name = Helpers.escapeDot(name);
      return Subscriptions.get({subscription: name});
    };
    this.query = function() {
      return Subscriptions.query();
    };
}]);

/**
* User Config
*/
serviceModule.service('UserConfig', ['$cookieStore',
function ($cookieStore) {
  this.get = function(name) {
    return $cookieStore.get(name) || false;
  };
  this.set = function(name, value) {
    $cookieStore.put(name, value);
  };
}]);

/**
* User service
*/
serviceModule.service('User', ['$cookieStore', '$location', '$resource', '$rootScope',
function ($cookieStore, $location, $resource, $rootScope) {
  var User = $resource('user');
  this.email = function() {
    var user = $cookieStore.get('user', null, {withCredentials: true});
    return user.email || '';
  };
  this.get = function() {
    return User.get();
  };
  this.isReadOnly = function() {
    var user = $cookieStore.get('user');
    if (user && user.role && angular.isDefined(user.role.Readonly)) {
      return user.role.Readonly;
    }
    return false;
  };
  this.isAdmin = function() {
    return false;
  };
  this.subscriptions = function() {
    if ($rootScope.isAuthenticated) {
      var user = $cookieStore.get('user');
      return user.role.Subscriptions || [];
    }
    return [];
  };
  this.set = function() {
    User.get()
      .$promise.then(function(user) {
        $cookieStore.put('user', user);
        $rootScope.isAuthenticated = true;
      },
      function(error) {
        console.error(error);
      });
  };
  this.username = function () {
    if ($rootScope.isAuthenticated) {
      var user = $cookieStore.get('user');
      return user.fullname || user.username;
    }
    return '';
  };
}]);
