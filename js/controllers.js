'use strict';

var controllerModule = angular.module('uchiwa.controllers', []);

/**
* Aggregate
*/
controllerModule.controller('AggregateController', ['backendService', '$http', '$rootScope', '$scope', '$routeParams', 'routingService', 'Sensu', 'titleFactory',
  function (backendService, $http, $rootScope, $scope, $routeParams, routingService, Sensu, titleFactory) {
    $scope.pageHeaderText = 'Aggregates';
    titleFactory.set($scope.pageHeaderText);

    // Routing
    $scope.dc = decodeURI($routeParams.dc);
    $scope.name = decodeURI($routeParams.name);

    // Get aggregates
    $scope.aggregates = [];
    var timer = Sensu.updateAggregates();
    $scope.$watch(function () { return Sensu.getAggregates(); }, function (data) {
      $scope.aggregates = _.find(data, function(aggregate) { // jshint ignore:line
        return $scope.name === aggregate.name && $scope.dc === aggregate.dc;
      });
    });
    $scope.$on('$destroy', function() {
      Sensu.stop(timer);
    });

    // Add support for aggregates v2.0 in Sensu >= 0.24.0
    $scope.$watch('aggregates', function () {
      if (angular.isDefined($scope.aggregates) && angular.isUndefined($scope.aggregates.issued)) {
        backendService.getAggregate($scope.name, $scope.dc)
          .success(function(data) {
            $scope.aggregate = data;
          })
          .error(function(error) {
            $scope.aggregate = null;
            console.error(error);
          });
      }
    });

    // Get aggregate
    $scope.aggregate = null;
    var getAggregate = function() {
      $scope.issued = decodeURI($routeParams.issued);
      if (isNaN($scope.issued)) {
        $scope.aggregate = null;
        return;
      }
      backendService.getAggregateIssued($scope.name, $scope.dc, $scope.issued)
        .success(function(data) {
          $scope.aggregate = {results: data};
        })
        .error(function(error) {
          $scope.aggregate = null;
          console.error(error);
        });
    };
    $scope.$on('$routeChangeSuccess', function(){
      getAggregate();
    });
    $scope.$on('$routeUpdate', function(){
      getAggregate();
    });

    // Services
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;
  }
]);

/**
* Aggregates
*/
controllerModule.controller('AggregatesController', ['filterService', '$routeParams', 'routingService', '$scope', 'Sensu', 'titleFactory',
  function (filterService, $routeParams, routingService, $scope, Sensu, titleFactory) {
    $scope.pageHeaderText = 'Aggregates';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'check';
    $scope.reverse = false;

    // Get aggregates
    $scope.aggregates = [];
    var timer = Sensu.updateAggregates();
    $scope.$watch(function () { return Sensu.getAggregates(); }, function (data) {
      $scope.aggregates = data;
    });
    $scope.$on('$destroy', function() {
      Sensu.stop(timer);
    });

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'limit', 'q']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.filterComparator = filterService.comparator;
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;
  }
]);

/**
* Checks
*/
controllerModule.controller('ChecksController', ['checksService', '$filter', 'filterService', 'helperService', '$routeParams', 'routingService', '$scope', 'Sensu', 'titleFactory',
  function (checksService, $filter, filterService, helperService, $routeParams, routingService, $scope, Sensu, titleFactory) {
    $scope.pageHeaderText = 'Checks';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'name';
    $scope.reverse = false;
    $scope.selected = {all: false, ids: {}};

    var updateFilters = function() {
      var filtered = $filter('filter')($scope.checks, {dc: $scope.filters.dc}, $scope.filterComparator);
      filtered = $filter('filter')(filtered, $scope.filters.q);
      filtered = $filter('collection')(filtered, 'checks');
      $scope.filtered = filtered;
    };

    // Get checks
    $scope.checks = [];
    $scope.filtered = [];
    var timer = Sensu.updateChecks();
    $scope.$watch(function () { return Sensu.getChecks(); }, function (data) {
      $scope.checks = data;
      updateFilters();
    });
    $scope.$on('$destroy', function() {
      Sensu.stop(timer);
    });

    // Helpers
    $scope.subscribersSummary = function(subscribers){
      return subscribers.join(' ');
    };

    // Filters
    $scope.$watchGroup(['collection.search', 'filters.q', 'filters.dc'], function(newValues, oldValues) {
      updateFilters();
      helperService.updateSelected(newValues, oldValues, $scope.filtered, $scope.selected);
    });

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'limit', 'q']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.filterComparator = filterService.comparator;
    $scope.permalink = routingService.permalink;
    $scope.selectAll = helperService.selectAll;

    $scope.issueCheckRequest = function() {
      var items = helperService.getSelected($scope.filtered, $scope.selected);
      angular.forEach(items, function(item) {
        checksService.issueCheckRequest(item.name, item.dc, item.subscribers);
      });
    };
  }
]);

/**
* Client
*/
controllerModule.controller('ClientController', ['backendService', 'clientsService', 'conf', '$filter', 'notification', 'titleFactory', '$routeParams', 'routingService', '$scope', 'Sensu', 'silencedService', 'userService',
  function (backendService, clientsService, conf, $filter, notification, titleFactory, $routeParams, routingService, $scope, Sensu, silencedService, userService) {
    $scope.predicate = '-last_status';
    $scope.reverse = false;

    // Routing
    $scope.clientName = decodeURI($routeParams.client);
    $scope.dc = decodeURI($routeParams.dc);

    var searchCheckHistory = clientsService.searchCheckHistory;

    // Get check
    $scope.check = null;
    var checkName = null;
    // return the events or the client's history
    var getCheck = function() {
      if (!$scope.client || !$scope.client.name) {
        return;
      }

      if (angular.isDefined($routeParams.check)) {
        checkName = $routeParams.check;
        var check = searchCheckHistory(checkName, $scope.client.history);
        if (!check) {
          return;
        }

        if (angular.isDefined(check.last_result)) { // jshint ignore:line
          check.last_result.history = check.history; // jshint ignore:line
        }

        // apply filters
        var images = [];
        angular.forEach(check.last_result, function(value, key) { // jshint ignore:line
          value = $filter('getTimestamp')(value);
          value = $filter('richOutput')(value);

          if (/<img src=/.test(value)) {
            var obj = {};
            obj.key = key;
            obj.value = value;
            images.push(obj);
            delete check.last_result[key]; // jshint ignore:line
          } else {
            check.last_result[key] = value; // jshint ignore:line
          }
        });
        $scope.images = images;

        $scope.check = check;
        titleFactory.set(check.check + ' - ' + $scope.client.name);
      }
      else {
        $scope.check = null;
        $scope.images = null;
        checkName = null;
        titleFactory.set($scope.client.name);
      }
    };

    // Get client
    $scope.client = null;
    var clientTimer = Sensu.updateClient($scope.clientName, $scope.dc);
    $scope.$watch(function () { return Sensu.getClient(); }, function (data) {
      $scope.client = data;
      getCheck();
    });

    // Get events
    var events = [];
    var eventsTimer = Sensu.updateEvents();
    $scope.$watch(function () { return Sensu.getEvents(); }, function (data) {
      events = data;
    });

    $scope.$on('$destroy', function() {
      Sensu.stop(clientTimer);
      Sensu.stop(eventsTimer);
      Sensu.cleanClient();
    });

    $scope.$on('$routeChangeSuccess', function(){
      getCheck();
    });
    $scope.$on('$routeUpdate', function(){
      getCheck();
    });

    // Services
    $scope.deleteCheckResult = clientsService.deleteCheckResult;
    $scope.deleteClient = clientsService.deleteClient;
    $scope.resolveEvent = clientsService.resolveEvent;
    $scope.permalink = routingService.permalink;
    $scope.silence = silencedService.create;
    $scope.user = userService;
  }
]);

/**
* Clients
*/
controllerModule.controller('ClientsController', ['clientsService', '$filter', 'filterService', 'helperService', '$rootScope', '$routeParams', 'routingService', '$scope', 'Sensu', 'silencedService', 'titleFactory', 'userService',
  function (clientsService, $filter, filterService, helperService, $rootScope, $routeParams, routingService, $scope, Sensu, silencedService, titleFactory, userService) {
    $scope.pageHeaderText = 'Clients';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = ['-status', 'name'];
    $scope.reverse = false;
    $scope.selected = {all: false, ids: {}};
    $scope.statuses = {0: 'Healthy', 1: 'Warning', 2: 'Critical', 3: 'Unknown'};

    var updateFilters = function() {
      var filtered = $filter('filter')($scope.clients, {dc: $scope.filters.dc}, $scope.filterComparator);
      filtered = $filter('filter')(filtered, {status: $scope.filters.status});
      filtered = $filter('filterSubscriptions')(filtered, $scope.filters.subscription);
      filtered = $filter('filter')(filtered, $scope.filters.q);
      filtered = $filter('collection')(filtered, 'clients');
      $scope.filtered = filtered;
    };

    // Get clients
    $scope.clients = [];
    $scope.filtered = [];
    var timer = Sensu.updateClients();
    $scope.$watch(function () { return Sensu.getClients(); }, function (data) {
      $scope.clients = data;
      updateFilters();
    });
    $scope.$on('$destroy', function() {
      Sensu.stop(timer);
    });

    // Get subscriptions
    Sensu.updateSubscriptions();
    $scope.$watch(function () { return Sensu.getSubscriptions(); }, function (data) {
      if (angular.isObject(data)) {
        $scope.subscriptions = data;
      }
    });

    // Filters
    $scope.$watchGroup(['collection.search', 'filters.q', 'filters.dc', 'filters.subscription', 'filters.status'], function(newValues, oldValues) {
      updateFilters();
      helperService.updateSelected(newValues, oldValues, $scope.filtered, $scope.selected);
    });

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'subscription', 'limit', 'q', 'status']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.filterComparator = filterService.comparator;
    $scope.go = routingService.go;
    $scope.openLink = helperService.openLink;
    $scope.permalink = routingService.permalink;
    $scope.selectAll = helperService.selectAll;
    $scope.silence = silencedService.create;
    $scope.user = userService;
    $scope.deleteClients = function() {
      helperService.deleteItems(clientsService.deleteClient, $scope.filtered, $scope.selected).then(function(filtered){
        $scope.filtered = filtered;
      });
    };
    $scope.silenceClients = function() {
      helperService.silenceItems(silencedService.create, $scope.filtered, $scope.selected);
    };
  }
]);

/**
* Datacenters
*/
controllerModule.controller('DatacentersController', ['$scope', 'Sensu', 'titleFactory',
  function ($scope, Sensu, titleFactory) {
    $scope.pageHeaderText = 'Datacenters';
    titleFactory.set($scope.pageHeaderText);

    // Get health and metrics
    var timer = Sensu.updateMetrics();
    $scope.$on('$destroy', function() {
      Sensu.stop(timer);
    });
  }
]);

/**
* Events
*/
controllerModule.controller('EventsController', ['clientsService', 'conf', '$cookieStore', '$filter', 'filterService', 'helperService', '$rootScope', '$routeParams','routingService', '$scope', 'Sensu', 'silencedService', 'titleFactory', 'userService',
  function (clientsService, conf, $cookieStore, $filter, filterService, helperService, $rootScope, $routeParams, routingService, $scope, Sensu, silencedService, titleFactory, userService) {
    $scope.pageHeaderText = 'Events';
    titleFactory.set($scope.pageHeaderText);

    $scope.filters = {};
    $scope.predicate = ['-check.status', '-check.issued'];
    $scope.reverse = false;
    $scope.selected = {all: false, ids: {}};
    $scope.statuses = {1: 'Warning', 2: 'Critical', 3: 'Unknown'};

    var updateFilters = function() {
      var filtered = $filter('filter')($scope.events, {dc: $scope.filters.dc}, $scope.filterComparator);
      filtered = $filter('filter')(filtered, {check: {status: $scope.filters.status}});
      filtered = $filter('hideSilenced')(filtered, $scope.filters.silenced);
      filtered = $filter('hideClientsSilenced')(filtered, $scope.filters.clientsSilenced);
      filtered = $filter('hideOccurrences')(filtered, $scope.filters.occurrences);
      filtered = $filter('filter')(filtered, {check: {name: $scope.filters.check}});
      filtered = $filter('filter')(filtered, $scope.filters.q);
      filtered = $filter('collection')(filtered, 'events');
      $scope.filtered = filtered;
    };

    // Get events
    $scope.events = [];
    $scope.filtered = [];
    var timer = Sensu.updateEvents();
    $scope.$watch(function () { return Sensu.getEvents(); }, function (data) {
      if (angular.isObject(data)) {
        $scope.events = data;
        updateFilters();
      }
    });
    $scope.$on('$destroy', function() {
      Sensu.stop(timer);
    });

    // Filters
    $scope.$watchGroup(['collection.search', 'filters.q', 'filters.dc', 'filters.check' , 'filters.status' , 'filters.silenced' , 'filters.clientsSilenced' , 'filters.occurrences'], function(newValues, oldValues) {
      updateFilters();
      helperService.updateSelected(newValues, oldValues, $scope.filtered, $scope.selected);
    });

    // Routing
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'check', 'limit', 'q', 'status']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.filterComparator = filterService.comparator;
    $scope.go = routingService.go;
    $scope.openLink = helperService.openLink;
    $scope.permalink = routingService.permalink;
    $scope.selectAll = helperService.selectAll;
    $scope.silence = silencedService.create;
    $scope.user = userService;
    $scope.resolveEvents = function() {
      helperService.deleteItems(clientsService.resolveEvent, $scope.filtered, $scope.selected).then(function(filtered){
        $scope.filtered = filtered;
      });
    };
    $scope.silenceEvents = function() {
      helperService.silenceItems(silencedService.create, $scope.filtered, $scope.selected);
    };

    // Hide silenced
    $scope.filters.silenced = $cookieStore.get('hideSilenced') || conf.hideSilenced;
    $scope.$watch('filters.silenced', function () {
      $cookieStore.put('hideSilenced', $scope.filters.silenced);
    });

    // Hide events from silenced clients
    $scope.filters.clientsSilenced = $cookieStore.get('hideClientsSilenced') || conf.hideClientsSilenced;
    $scope.$watch('filters.clientsSilenced', function () {
      $cookieStore.put('hideClientsSilenced', $scope.filters.clientsSilenced);
    });

    // Hide occurrences
    $scope.filters.occurrences = $cookieStore.get('hideOccurrences') || conf.hideOccurrences;
    $scope.$watch('filters.occurrences', function () {
      $cookieStore.put('hideOccurrences', $scope.filters.occurrences);
    });
  }
]);

/**
* Info
*/
controllerModule.controller('InfoController', ['backendService', '$scope', 'Sensu', 'titleFactory', 'version',
  function (backendService, $scope, Sensu, titleFactory, version) {
    $scope.pageHeaderText = 'Info';
    titleFactory.set($scope.pageHeaderText);

    $scope.uchiwa = { version: version.uchiwa };

    // Get health and metrics
    var timer = Sensu.updateMetrics();
    $scope.$on('$destroy', function() {
      Sensu.stop(timer);
    });
  }
]);

/**
* Login
*/
controllerModule.controller('LoginController', ['audit', 'backendService', '$cookieStore', '$location', 'notification', '$rootScope', '$scope',
function (audit, backendService, $cookieStore, $location, notification, $rootScope, $scope) {

  $scope.login = {user: '', pass: ''};

  // get the authentication mode
  backendService.getConfigAuth()
    .success(function (data) {
      $scope.configAuth = data;
    })
    .error(function () {
      $scope.configAuth = 'simple';
    });

  $scope.submit = function () {
    backendService.login($scope.login)
    .success(function (data) {
      $cookieStore.put('uchiwa_auth', data);
      $rootScope.auth = {};
      $location.path('/events');
      backendService.getConfig();

      if ($rootScope.enterprise) {
        var username = data.username;
        if (angular.isUndefined(username)) {
          username = '';
        }
        audit.log({action: 'login', level: 'default'});
      }
    })
    .error(function () {
      notification('error', 'There was an error with your username/password combination. Please try again.');
    });
  };

  if (angular.isObject($rootScope.auth) || angular.isObject($rootScope.config)) {
    $location.path('/events');
  }
}
]);

/**
* Navbar
*/
controllerModule.controller('NavbarController', ['audit', '$location', '$rootScope', '$scope', 'navbarServices', 'routingService', 'userService',
  function (audit, $location, $rootScope, $scope, navbarServices, routingService, userService) {

    // Helpers
    $scope.getClass = function(path) {
      if ($location.path().substr(0, path.length) === path) {
        return 'selected';
      } else {
        return '';
      }
    };

    // Services
    $scope.go = routingService.go;
    $scope.user = userService;

    $scope.logout = function() {
      if ($rootScope.enterprise) {
        var username = userService.getUsername();
        audit.log({action: 'logout', level: 'default', user: username}).finally(
          function() {
            userService.logout();
          });
      }
      else {
        userService.logout();
      }
    };
  }
]);

/**
* Settings
*/
controllerModule.controller('SettingsController', ['$cookies', '$scope', 'Sensu', 'titleFactory',
  function ($cookies, $scope, Sensu, titleFactory) {
    $scope.pageHeaderText = 'Settings';
    titleFactory.set($scope.pageHeaderText);

    $scope.$watch('currentTheme', function (theme) {
      $scope.$emit('theme:changed', theme);
    });

    // Get health and metrics
    var timer = Sensu.updateMetrics();
    $scope.$on('$destroy', function() {
      Sensu.stop(timer);
    });
  }
]);

/**
* Sidebar
*/
controllerModule.controller('SidebarController', ['$location', 'navbarServices', '$scope', 'userService',
  function ($location, navbarServices, $scope, userService) {
    // Get CSS class for sidebar elements
    $scope.getClass = function(path) {
      if ($location.path().substr(0, path.length) === path) {
        return 'selected';
      } else {
        return '';
      }
    };

    $scope.$watch('metrics', function() {
      if (angular.isObject($scope.metrics) && angular.isDefined($scope.metrics.clients)) {
        $scope.clientsStyle = $scope.metrics.clients.critical > 0 ? 'critical' : $scope.metrics.clients.warning > 0 ? 'warning' : $scope.metrics.clients.unknown > 0 ? 'unknown' : 'success';
        $scope.eventsStyle = $scope.metrics.events.critical > 0 ? 'critical' : $scope.metrics.events.warning > 0 ? 'warning' : $scope.metrics.events.unknown > 0 ? 'unknown' : 'success';
      }
      else {
        $scope.clientsStyle = 'unknown';
        $scope.eventsStyle = 'unknown';
      }
    });

    // Services
    $scope.user = userService;
    $scope.$watch('health', function (){
      navbarServices.health();
    });
  }
]);

/**
* Silenced
*/
controllerModule.controller('SilencedController', ['$filter', 'filterService', 'helperService', '$rootScope', '$routeParams', 'routingService', '$scope', 'Sensu', 'silencedService', 'titleFactory', 'userService',
  function ($filter, filterService, helperService, $rootScope, $routeParams, routingService, $scope, Sensu, silencedService, titleFactory, userService) {
    $scope.pageHeaderText = 'Silenced';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'id';
    $scope.reverse = false;
    $scope.selectAll = {checked: false};
    $scope.selected = {all: false, ids: {}};

    var updateFilters = function() {
      var filtered = $filter('filter')($scope.silenced, {dc: $scope.filters.dc}, $scope.filterComparator);
      filtered = $filter('filter')(filtered, $scope.filters.q);
      filtered = $filter('collection')(filtered, 'silenced');
      $scope.filtered = filtered;
    };

    // Get silenced
    $scope.silenced = [];
    $scope.filtered = [];
    var timer = Sensu.updateSilenced();
    $scope.$watch(function () { return Sensu.getSilenced(); }, function (data) {
      $scope.silenced = data;
      updateFilters();
    });
    $scope.$on('$destroy', function() {
      Sensu.stop(timer);
    });

    // Filters
    $scope.$watchGroup(['collection.search', 'filters.q', 'filters.dc'], function(newValues, oldValues) {
      updateFilters();
      helperService.updateSelected(newValues, oldValues, $scope.filtered, $scope.selected);
    });

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'limit', 'q']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.filterComparator = filterService.comparator;
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;
    $scope.selectAll = helperService.selectAll;
    $scope.user = userService;
    $scope.deleteSilenced = function($event, id) {
      $event.stopPropagation();
      silencedService.delete(id).then(function() {
        $scope.filtered = $filter('filter')($scope.filtered, {_id: '!'+ id});
        $rootScope.skipOneRefresh = true;
      });
    };
    $scope.deleteMultipleSilenced = function() {
      helperService.deleteItems(silencedService.delete, $scope.filtered, $scope.selected).then(function(filtered){
        $scope.filtered = filtered;
      });
    };
  }
]);

/**
* Silenced Entry
*/
controllerModule.controller('SilencedEntryController', [ 'backendService', '$filter', '$routeParams', 'routingService', '$scope', 'Sensu', 'silencedService', 'titleFactory',
  function (backendService, $filter, $routeParams, routingService, $scope, Sensu, silencedService, titleFactory) {
    // Routing
    $scope.id = decodeURI($routeParams.id);
    titleFactory.set($scope.id);

    // Get the stash
    $scope.entry = null;
    var silenced = [];
    backendService.getSilenced()
      .success(function (data) {
        silenced = data;

        $scope.entry = silencedService.find(silenced, $scope.id);
      })
      .error(function(error) {
        if (error !== null) {
          console.error(JSON.stringify(error));
        }
      });

    // Get health and metrics
    var timer = Sensu.updateMetrics();
    $scope.$on('$destroy', function() {
      Sensu.stop(timer);
    });

    $scope.deleteSilenced = function($event, id) {
      $event.stopPropagation();
      silencedService.delete(id).then(function() {
        routingService.go('/silenced');
      });
    };
  }
]);

/**
* Silenced Modal
*/
controllerModule.controller('SilencedModalController', ['backendService', 'conf', '$filter', 'items', '$modalInstance', 'notification', '$q', '$scope', 'Sensu', 'silencedService',
  function (backendService, conf, $filter, items, $modalInstance, notification, $q, $scope, Sensu, silencedService) {
    $scope.items = items;
    $scope.silencedCount = $filter('filter')(items, {silenced: true}).length;
    $scope.itemType = items[0].hasOwnProperty('client') ? 'check' : 'client';
    $scope.options = {expire: 900, reason: '', to: moment().add(1, 'h').format(conf.date)};

    $scope.silenced = [];
    var getSilencedIDs = function(data) {
      var silencedByIds = [];
      angular.forEach(items, function(item) {
        if (item.silenced) {
          // Do we have a client?
          if (angular.isUndefined(item.silenced_by)) { // jshint ignore:line
            item.silenced_by = ['client:' + item.name + ':*']; // jshint ignore:line
          }
          angular.forEach(item.silenced_by, function(id){ // jshint ignore:line
            var _id = item.dc + ':' + id;
            if (silencedByIds.indexOf(_id) === -1) {
              $scope.silenced.push($scope.findSilenced(data, _id));
              silencedByIds.push(_id);
            }
          });
        }
      });
    };

    // Get silenced entries
    backendService.getSilenced().then(function(data) {
      getSilencedIDs(data.data);
    });

    $scope.ok = function() {
      if ($scope.options.expire === 'custom') {
        if (angular.isUndefined($scope.options.to)) {
          notification('error', 'Please enter a date for the custom expiration.');
          return false;
        }
      }

      var promises = [];
      var deffered = $q.defer();

      // Silenced entries to Clear
      angular.forEach($scope.silenced, function(entry) {
        silencedService.delete(entry._id).then(function() {
          deffered.resolve(entry);
        }, function() {
          deffered.reject();
        });
      });

      // Silenced entries to create
      angular.forEach(items, function(item) {
        if (!item.silenced) {
          var payload = {dc: item.dc, expire: $scope.options.expire, expire_on_resolve: $scope.options.expire_on_resolve, reason: $scope.options.reason}; // jshint ignore:line

          // Determine the subscription
          if ($scope.itemType === 'client') {
            payload.subscription = 'client:' + item.name;
          } else {
            payload.subscription = 'client:';
            payload.subscription += item.client.name || item.client;
            payload.check = item.check.name || item.check;
          }

          silencedService.post(payload).then(function() {
            deffered.resolve(item);
          }, function() {
            deffered.reject();
          });
        }

        promises.push(deffered.promise);
      });
      $q.all(promises).then(function() {
        $modalInstance.close();
      });
    };
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };

    // Services
    $scope.findSilenced = silencedService.find;
  }
]);

/**
* Stash
*/
controllerModule.controller('StashController', [ 'backendService', '$filter', '$routeParams', '$scope', 'Sensu', 'stashesService', 'titleFactory',
  function (backendService, $filter, $routeParams, $scope, Sensu, stashesService, titleFactory) {
    // Routing
    $scope.id = decodeURI($routeParams.id);
    titleFactory.set($scope.id);

    // Get the stash
    $scope.stash = null;
    var stashes = [];
    backendService.getStashes()
      .success(function (data) {
        stashes = data;

        var stash = stashesService.get(stashes, $scope.id);
        // Prepare rich output
        angular.forEach(stash.content, function(value, key) { // jshint ignore:line
          value = $filter('getTimestamp')(value);
          value = $filter('richOutput')(value);
          stash.content[key] = value; // jshint ignore:line
        });

        $scope.stash = stash;
      })
      .error(function(error) {
        if (error !== null) {
          console.error(JSON.stringify(error));
        }
      });

    // Get health and metrics
    var timer = Sensu.updateMetrics();
    $scope.$on('$destroy', function() {
      Sensu.stop(timer);
    });
  }
]);

/**
* Stashes
*/
controllerModule.controller('StashesController', ['$filter', 'filterService', 'helperService', '$rootScope', '$routeParams', 'routingService', '$scope', 'Sensu', 'stashesService', 'titleFactory', 'userService',
  function ($filter, filterService, helperService, $rootScope, $routeParams, routingService, $scope, Sensu, stashesService, titleFactory, userService) {
    $scope.pageHeaderText = 'Stashes';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'client';
    $scope.reverse = false;
    $scope.selectAll = {checked: false};
    $scope.selected = {all: false, ids: {}};

    var updateFilters = function() {
      var filtered = $filter('filter')($scope.stashes, {dc: $scope.filters.dc}, $scope.filterComparator);
      filtered = $filter('filter')(filtered, $scope.filters.q);
      filtered = $filter('collection')(filtered, 'stashes');
      $scope.filtered = filtered;
    };

    // Get stashes
    $scope.stashes = [];
    $scope.filtered = [];
    var timer = Sensu.updateStashes();
    $scope.$watch(function () { return Sensu.getStashes(); }, function (data) {
      $scope.stashes = data;
      updateFilters();
    });
    $scope.$on('$destroy', function() {
      Sensu.stop(timer);
    });

    // Filters
    $scope.$watchGroup(['collection.search', 'filters.q', 'filters.dc'], function(newValues, oldValues) {
      updateFilters();
      helperService.updateSelected(newValues, oldValues, $scope.filtered, $scope.selected);
    });

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'limit', 'q']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.filterComparator = filterService.comparator;
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;
    $scope.selectAll = helperService.selectAll;
    $scope.user = userService;
    $scope.deleteStash = function($event, id) {
      $event.stopPropagation();
      stashesService.deleteStash(id).then(function() {
        $scope.filtered = $filter('filter')($scope.filtered, {_id: '!'+id});
        $rootScope.skipOneRefresh = true;
      });
    };
    $scope.deleteStashes = function() {
      helperService.deleteItems(stashesService.deleteStash, $scope.filtered, $scope.selected).then(function(filtered){
        $scope.filtered = filtered;
      });
    };
  }
]);
