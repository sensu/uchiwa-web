'use strict';

var serviceModule = angular.module('uchiwa.services', []);

/**
* Uchiwa
*/
serviceModule.service('backendService', ['audit', 'conf', '$http', '$interval', '$location', '$rootScope',
  function(audit, conf, $http, $interval, $location, $rootScope){
    var errorRefresh = conf.appName+' is having trouble updating its data. Try to refresh the page if this issue persists.';

    this.auth = function () {
      return $http.get('auth');
    };
    this.deleteClient = function (id) {
      if ($rootScope.enterprise) {
        audit.log({action: 'delete_client', level: 'default', output: id});
      }
      return $http.delete('clients/'+id);
    };
    this.deleteEvent = function (id) {
      return $http.delete('events/'+id);
    };
    this.deleteStash = function (id) {
      if ($rootScope.enterprise) {
        audit.log({action: 'delete_stash', level: 'default', output: id});
      }
      return $http.delete('stashes/'+id);
    };
    this.getAggregate = function(check, dc, issued) {
      return $http.get('aggregates/'+dc+'/'+check+'/'+issued);
    };
    this.getAggregates = function() {
      return $http.get('aggregates');
    };
    this.getChecks = function () {
      return $http.get('checks');
    };
    this.getClient = function (client, dc) {
      return $http.get('clients/'+dc+'/'+client);
    };
    this.getClients = function () {
      return $http.get('clients');
    };
    this.getConfig = function () {
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
      $http.get('health')
        .success(function(data) {
          $rootScope.health = data;
        })
        .error(function(error) {
          $rootScope.$emit('notification', 'error', errorRefresh);
          if (error !== null) {
            console.error(JSON.stringify(error));
          }
        });
    };
    this.getMetrics = function() {
      $http.get('metrics')
        .success(function(data) {
          $rootScope.metrics = data;
        })
        .error(function(error) {
          $rootScope.$emit('notification', 'error', errorRefresh);
          if (error !== null) {
            console.error(JSON.stringify(error));
          }
          if (angular.isUndefined($rootScope.metrics)) {
            $rootScope.metrics = {aggregates: {total: 0}, checks: {total: 0}, clients: {critical: 0, total: 0, unknown: 0, warning: 0}, datacenters: {total: 0}, events: {critical: 0, total: 0, unknown: 0, warning: 0}, stashes: {total: 0}};
          }
        });
    };
    this.getSEMetrics = function(endpoint) {
      return $http.get('metrics/'+endpoint);
    };
    this.getStashes = function () {
      return $http.get('stashes');
    };
    this.getSubscriptions = function () {
      return $http.get('subscriptions');
    };
    this.login = function (payload) {
      return $http.post('login', payload);
    };
    this.postStash = function (payload) {
      return $http.post('stashes', payload);
    };
  }
]);

/**
* Clients Services
*/
serviceModule.service('clientsService', ['$location', '$rootScope', 'backendService', function ($location, $rootScope, backendService) {
  this.searchCheckHistory = function (name, history) {
    return history.filter(function (item) {
      return item.check === name;
    })[0];
  };
  this.resolveEvent = function (id) {
    return backendService.deleteEvent(id)
      .success(function () {
        $rootScope.$emit('notification', 'success', 'The event has been resolved.');
      })
      .error(function (error) {
        $rootScope.$emit('notification', 'error', 'The event "'+id+'" was not resolved.');
        console.error(error);
      });
  };
  this.deleteClient = function (id) {
    return backendService.deleteClient(id)
      .success(function () {
        $rootScope.$emit('notification', 'success', 'The client has been deleted.');
      })
      .error(function (error) {
        $rootScope.$emit('notification', 'error', 'Could not delete the client '+ id);
        console.error(error);
      });
  };
}]);

/**
* Filter
*/
serviceModule.service('filterService', function () {
  this.comparator = function(actual, expected) {
    if (angular.isUndefined(expected) || expected === '') {
      return true;
    }
    return angular.equals(actual, expected);
  };
});

/**
* Navbar
*/
serviceModule.service('navbarServices', ['$rootScope', function ($rootScope) {
  this.health = function () {
    var alerts = [];
    if (angular.isObject($rootScope.health)) {
      angular.forEach($rootScope.health.sensu, function(value, key) {
        if (value.output !== 'ok') {
          alerts.push('Datacenter <strong>' + key + '</strong> returned: <em>' + value.output + '</em>');
        }
      });
    }
    $rootScope.alerts = alerts;
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
    if (value === '') {
      filters[key] = filtersDefaultValues[key] ? filtersDefaultValues[key] : value;
    }
    else {
      filters[key] = value;
    }
  };
}]);

/**
* Stashes
*/
serviceModule.service('stashesService', ['backendService', 'conf', '$filter', '$modal', '$rootScope',
  function (backendService, conf, $filter, $modal, $rootScope) {
    this.deleteStash = function (id) {
      return backendService.deleteStash(id)
        .success(function () {
          $rootScope.$emit('notification', 'success', 'The stash has been deleted.');
        })
        .error(function (error) {
          $rootScope.$emit('notification', 'error', 'The stash was not created.');
          console.error(error);
        });
    };
    this.find = function(stashes, item) {
      var path = this.getPath(item);
      return _.findWhere(stashes, {
        dc: item.dc,
        path: path
      });
    };
    this.getExpirationFromDateRange = function(stash) {
      if (angular.isUndefined(stash) || !angular.isObject(stash) || angular.isUndefined(stash.content) || !angular.isObject(stash.content)) {
        return stash;
      }

      var now = moment();
      var start = now.format(conf.date);
      var end = moment(stash.content.to);
      var amDifference = $filter('amDifference');
      var diff = amDifference(end, start, 'seconds');

      stash.content.timestamp = now.unix();
      stash.expiration = diff;
      return stash;
    };
    this.getPath = function(item) {
      var path = ['silence'];
      var hasCheck = true;

      // get client name
      if (angular.isUndefined(item) || !angular.isObject(item)) {
        $rootScope.$emit('notification', 'error', 'Cannot handle this stash. Try to refresh the page.');
        return false;
      }
      else {
        if (angular.isUndefined(item.client)) {
          path.push(item.name);
          hasCheck = false;
        }
        else {
          if (angular.isObject(item.client)) {
            path.push(item.client.name);
          }
          else {
            path.push(item.client);
          }
        }
      }

      // get check name
      if (hasCheck && angular.isDefined(item.check)) {
        if (angular.isObject(item.check)) {
          path.push(item.check.name);
        }
        else {
          path.push(item.check);
        }
      }

      return path.join('/');
    };
    this.stash = function (e, i) {
      var items = _.isArray(i) ? i : new Array(i);
      var event = e || window.event;
      if (angular.isDefined(event)) {
        event.stopPropagation();
      }

      if (items.length === 0) {
        $rootScope.$emit('notification', 'error', 'No items selected');
      } else {
        var modalInstance = $modal.open({ // jshint ignore:line
          templateUrl: $rootScope.partialsPath + '/stash-modal.html',
          controller: 'StashModalController',
          resolve: {
            items: function () {
              return items;
            }
          }
        });
      }
    };
    this.submit = function (element, item) {
      var dc = element.dc;
      var isAcknowledged = element.acknowledged;
      var path = this.getPath(element);

      if (angular.isUndefined(item.reason)) {
        item.reason = '';
      }

      if (isAcknowledged) {
        return backendService.deleteStash(dc+'/'+path)
          .success(function () {
            $rootScope.skipOneRefresh = true;
            $rootScope.$emit('notification', 'success', 'The stash has been deleted.');
            element.acknowledged = !element.acknowledged;
          })
          .error(function (error) {
            $rootScope.$emit('notification', 'error', 'The stash was not created. ' + error);
          });
      }
      else {
        var payload = {content: {'reason': item.reason, 'source': 'uchiwa'}, dc: dc, path: path};

        // add expire attribute
        if (item.expiration && item.expiration !== -1){
          payload.expire = item.expiration;
        }

        // add timestamp attribute
        if (angular.isUndefined(payload.content.timestamp)) {
          payload.content.timestamp = Math.floor(new Date()/1000);
        }
        else {
          payload.content.timestamp = item.content.timestamp;
        }

        // post payload
        return backendService.postStash(payload)
          .success(function () {
            $rootScope.skipOneRefresh = true;
            $rootScope.$emit('notification', 'success', 'The stash has been created.');
            element.acknowledged = !element.acknowledged;
          })
          .error(function (error) {
            $rootScope.$emit('notification', 'error', 'The stash was not created. ' + error);
          });
      }
    };
}]);

/**
* Helpers service
*/
serviceModule.service('helperService', ['$filter', '$q', '$rootScope',
function($filter, $q, $rootScope) {
  this.deleteItems = function(fn, filtered, selected) {
    var promises = [];
    angular.forEach(selected.ids, function(value, key) {
      if (value) {
        var deffered = $q.defer();
        selected.ids[key] = false;
        fn(key).then(function() {
          filtered = $filter('filter')(filtered, {_id: '!'+key});
          deffered.resolve(key);
        }, function() {
          deffered.reject();
        });
        promises.push(deffered.promise);
      }
    });
    selected.all = false;
    $rootScope.skipOneRefresh = true;
    return $q.all(promises).then(function() {
      return filtered;
    });
  };
  // Stop event propagation if an A tag is clicked
  this.openLink = function($event) {
    if($event.srcElement.tagName === 'A'){
      $event.stopPropagation();
    }
  };
  this.selectAll = function(filtered, selected) {
    angular.forEach(filtered, function(value) {
      selected.ids[value._id] = selected.all;
    });
  };
  this.silenceItems = function(fn, filtered, selected) {
    var itemsToSilence = [];
    angular.forEach(selected.ids, function(value, key) {
      if (value) {
        var found = $filter('filter')(filtered, {_id: key});
        if (found.length) {
          itemsToSilence.push(found[0]);
          selected.ids[key] = false;
        }
      }
    });
    fn(null, itemsToSilence);
    selected.all = false;
  };
  // updateSelected updates the selected array to remove any filtered items
  this.updateSelected = function(newValues, oldValues, filtered, selected) {
    // Check if we need to exclude any items
    var excludeItems = false;
    for (var i = 0; i < newValues.length; i++) {
      if ((newValues[i] !== '' && newValues[i]) && oldValues[i] !== newValues[i]) {
        excludeItems = true;
        break;
      }
    }
    if (!excludeItems) {
      return;
    }
    angular.forEach(selected.ids, function(value, key) {
      if (value) {
        var found = $filter('filter')(filtered, {_id: key});
        if (!found.length) {
          selected.ids[key] = false;
        }
      }
    });
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
