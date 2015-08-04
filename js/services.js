'use strict';

var serviceModule = angular.module('uchiwa.services', []);

/**
* Uchiwa
*/
serviceModule.service('backendService', ['audit', 'conf', '$http', '$interval', '$location', '$rootScope', '$timeout',
  function(audit, conf, $http, $interval, $location, $rootScope, $timeout){
    var self = this;
    this.auth = function () {
      return $http.get('auth');
    };
    this.dashboard = function () {
      return $http.get('dashboard');
    };
    this.deleteClient = function (client, dc) {
      if ($rootScope.enterprise) {
        audit.log({action: 'delete_client', level: 'default', output: dc+'/'+client});
      }
      return $http.get('delete_client?id=' + client + '&dc=' + dc );
    };
    this.deleteStash = function (payload) {
      if ($rootScope.enterprise) {
        audit.log({action: 'delete_stash', level: 'default', output: angular.toJson(payload)});
      }
      return $http.post('stashes/delete', payload);
    };
    this.getClient = function (client, dc) {
      return $http.get('get_client?id=' + client + '&dc=' + dc );
    };
    this.getConfig = function () {
      if ($location.path().substring(0, 6) === '/login') {
        return;
      }
      $http.get('get_config')
        .success(function (data) {
          $rootScope.config = data;
          conf.refresh = data.Uchiwa.Refresh * 1000;
        })
        .finally(function () {
          $interval(self.update, conf.refresh);
        });
    };
    this.getConfigAuth = function () {
      return $http.get('config/auth');
    };
    this.getSensu = function () {
      return $http.get('get_sensu');
    };
    this.login = function (payload) {
      return $http.post('login', payload);
    };
    this.postStash = function (payload) {
      return $http.post('stashes', payload);
    };
    this.resolveEvent = function (payload) {
      return $http.post('post_event', payload);
    };
    this.update = function () {
      if ($location.path().substring(0, 6) === '/login') {
        return;
      }
      if ($rootScope.skipRefresh) {
        $rootScope.skipRefresh = false;
        return;
      }
      self.getSensu()
      .success(function (data) {
        angular.forEach(data, function(value, key) { // initialize null elements
          if (!value || value === null) {
            data[key] = [];
          }
        });

        $rootScope.aggregates = data.Aggregates;
        $rootScope.checks = data.Checks;
        $rootScope.dc = data.Dc;
        $rootScope.health = data.Health;

        $rootScope.clients = _.map(data.Clients, function(client) {
          var existingClient = _.findWhere($rootScope.clients, {name: client.name, dc: client.dc});
          if (angular.isDefined(existingClient)) {
            if (angular.isUndefined(client.output) && angular.isDefined(existingClient.output)) {
              client.output = '';
            }
            client = angular.extend(existingClient, client);
          }
          return existingClient || client;
        });

        $rootScope.events = _.map(data.Events, function(event) {
          if (event.client.name === null && event.check.name === null) {
            return false;
          }
          event._id = event.dc + '/' + event.client.name + '/' + event.check.name;
          var existingEvent = _.findWhere($rootScope.events, {_id: event._id});
          if (existingEvent !== undefined) {
            event = angular.extend(existingEvent, event);
          }
          return existingEvent || event;
        });

        $rootScope.stashes = data.Stashes;
        $rootScope.subscriptions = data.Subscriptions;

        $timeout(function() {
          $rootScope.$broadcast('sensu');
        }, 100);

      })
      .error(function (error) {
        $rootScope.$emit('notification', 'error', 'Could not fetch Sensu data. Is Uchiwa running?');
        console.error(error);
      });
    };
  }
]);

/**
* Clients
*/
serviceModule.service('clientsService', ['$location', '$rootScope', 'backendService', function ($location, $rootScope, backendService) {
  this.getCheck = function (id, history) {
    return history.filter(function (item) {
      return item.check === id;
    })[0];
  };
  this.getEvent = function (client, check, events) {
    if (!client || !check || events.constructor.toString().indexOf('Array') === -1) { return null; }
    return events.filter(function (item) {
      return (item.client.name === client && item.check.name === check);
    })[0];
  };
  this.resolveEvent = function (dc, client, check) {
    if (!angular.isObject(client) || !angular.isObject(check)) {
      $rootScope.$emit('notification', 'error', 'Could not resolve this event. Try to refresh the page.');
      console.error('Received:\nclient='+ JSON.stringify(client) + '\ncheck=' + JSON.stringify(check));
      return false;
    }

    var checkName = check.name || check.check;
    var payload = {dc: dc, payload: {client: client.name, check: checkName}};

    backendService.resolveEvent(payload)
      .success(function () {
        $rootScope.$emit('notification', 'success', 'The event has been resolved.');
        if ($location.url() !== '/events') {
          $location.url(encodeURI('/client/' + dc + '/' + client.name));
        } else {
          var _id = dc + '/' + client.name + '/' + checkName;
          var event = _.findWhere($rootScope.events, {_id: _id});
          var eventPosition = $rootScope.events.indexOf(event);
          $rootScope.events.splice(eventPosition, 1);
        }
      })
      .error(function (error) {
        $rootScope.$emit('notification', 'error', 'The event was not resolved. ' + error);
      });
  };
  this.deleteClient = function (dc, client) {
    backendService.deleteClient(client, dc)
      .success(function () {
        $rootScope.$emit('notification', 'success', 'The client has been deleted.');
        $location.url('/clients');
        return true;
      })
      .error(function (error) {
        $rootScope.$emit('notification', 'error', 'Could not delete the client '+ client +'. Is Sensu API running on '+ dc +'?');
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
  // Badges count
  this.countStatuses = function (item, getStatusCode) {
    var collection = $rootScope[item];
    if (!_.isObject($rootScope.navbar)) {
      $rootScope.navbar = {};
    }
    $rootScope.navbar[item] = { critical: 0, warning: 0, unknown: 0, style: '' };

    $rootScope.navbar[item].critical += collection.filter(function (item) {
      return getStatusCode(item) === 2;
    }).length;
    $rootScope.navbar[item].warning += collection.filter(function (item) {
      return getStatusCode(item) === 1;
    }).length;
    $rootScope.navbar[item].unknown += collection.filter(function (item) {
      return getStatusCode(item) > 2;
    }).length;

    $rootScope.navbar[item].style = $rootScope.navbar[item].critical > 0 ? 'critical' : $rootScope.navbar[item].warning > 0 ? 'warning' : $rootScope.navbar[item].unknown > 0 ? 'unknown' : 'success';
  };
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
    path = encodeURI(path);
    $location.url(path);
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
    this.deleteStash = function (stash) {
      $rootScope.skipRefresh = true;
      var payload = {dc: stash.dc, path: stash.path};
      backendService.deleteStash(payload)
        .success(function () {
          $rootScope.$emit('notification', 'success', 'The stash has been deleted.');
          for (var i=0; $rootScope.stashes; i++) {
            if ($rootScope.stashes[i].path === stash.path) {
              $rootScope.stashes.splice(i, 1);
              break;
            }
          }
          return true;
        })
        .error(function (error) {
          $rootScope.$emit('notification', 'error', 'The stash was not created. ' + error);
          return false;
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
      event.stopPropagation();

      if (items.length === 0) {
        $rootScope.$emit('notification', 'error', 'No items selected');
      } else {
        var modalInstance = $modal.open({ // jshint ignore:line
          templateUrl: $rootScope.partialsPath + '/stash-modal.html',
          controller: 'StashModalCtrl',
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
      var payload = {};
      var path = this.getPath(element);

      if (angular.isUndefined(item.reason)) {
        item.reason = '';
      }

      $rootScope.skipRefresh = true;
      if (isAcknowledged) {
        payload = {dc: dc, path: path};
        backendService.deleteStash(payload)
          .success(function () {
            $rootScope.$emit('notification', 'success', 'The stash has been deleted.');
            element.acknowledged = !element.acknowledged;
            return true;
          })
          .error(function (error) {
            $rootScope.$emit('notification', 'error', 'The stash was not created. ' + error);
            return false;
          });
      }
      else {
        payload = {content: {'reason': item.reason, 'source': 'uchiwa'}, dc: dc, path: path};

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
        backendService.postStash(payload)
          .success(function () {
            $rootScope.$emit('notification', 'success', 'The stash has been created.');
            element.acknowledged = !element.acknowledged;
            return true;
          })
          .error(function (error) {
            $rootScope.$emit('notification', 'error', 'The stash was not created. ' + error);
            return false;
          });
      }
    };
}]);

/**
* Helpers service
*/
serviceModule.service('helperService', function() {
  // Stop event propagation if an A tag is clicked
  this.openLink = function($event) {
    if($event.srcElement.tagName === 'A'){
      $event.stopPropagation();
    }
  };
  this.selectedItems = function(items) {
    return _.filter(items, function(item) {
      return item.selected === true;
    });
  };
  this.unselectItems = function(items) {
    _.each(items, function(item) {
      if (item.selected === true) {
        item.selected = false;
      }
    });
  };
});

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
