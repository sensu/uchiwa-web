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
    $scope.check = decodeURI($routeParams.check);

    // Get aggregates
    $scope.aggregates = [];
    var timer = Sensu.updateAggregates();
    $scope.$watch(function () { return Sensu.getAggregates(); }, function (data) {
      $scope.aggregates = _.find(data, function(aggregate) { // jshint ignore:line
        return $scope.check === aggregate.check && $scope.dc === aggregate.dc;
      });
    });
    $scope.$on('$destroy', function() {
      Sensu.stop(timer);
    });

    // Get aggregate
    $scope.aggregate = null;
    var getAggregate = function() {
      $scope.issued = decodeURI($routeParams.issued);
      if (isNaN($scope.issued)) {
        $scope.aggregate = null;
        return;
      }
      backendService.getAggregate($scope.check, $scope.dc, $scope.issued)
        .success(function(data) {
          $scope.aggregate = data;
        })
        .error(function(error) {
          $scope.aggregate = null;
          console.log(JSON.stringify(error));
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
controllerModule.controller('ChecksController', ['filterService', '$routeParams', 'routingService', '$scope', 'Sensu', 'titleFactory',
  function (filterService, $routeParams, routingService, $scope, Sensu, titleFactory) {
    $scope.pageHeaderText = 'Checks';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'name';
    $scope.reverse = false;

    // Get checks
    $scope.checks = [];
    var timer = Sensu.updateChecks();
    $scope.$watch(function () { return Sensu.getChecks(); }, function (data) {
      $scope.checks = data;
    });
    $scope.$on('$destroy', function() {
      Sensu.stop(timer);
    });

    // Helpers
    $scope.subscribersSummary = function(subscribers){
      return subscribers.join(' ');
    };

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'limit', 'q']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.filterComparator = filterService.comparator;
    $scope.permalink = routingService.permalink;

  }
]);

/**
* Client
*/
controllerModule.controller('ClientController', ['backendService', 'clientsService', 'conf', '$filter', 'notification', 'titleFactory', '$routeParams', 'routingService', '$scope', 'Sensu', 'stashesService', 'userService',
  function (backendService, clientsService, conf, $filter, notification, titleFactory, $routeParams, routingService, $scope, Sensu, stashesService, userService) {
    $scope.predicate = '-last_status';
    $scope.reverse = false;

    // Routing
    $scope.clientName = decodeURI($routeParams.client);
    $scope.dc = decodeURI($routeParams.dc);

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
    });

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

        // search for an event associated to the check
        $scope.checkHasEvent = false;
        var event = searchEvent($scope.client.name, checkName, $scope.client.dc, events);
        if (angular.isObject(event)) {
          $scope.checkHasEvent = true;
          check.model = event.check;
        }
        else {
          if (!angular.isObject(check.model)) {
            check.model = { standalone: true };
          }

          check.model.history = check.history;
          check.model.last_execution = check.last_execution; // jshint ignore:line
          if (check.output !== null) {
            check.model.output = check.output;
          }
        }

        // apply filters
        var images = [];
        angular.forEach(check.model, function(value, key) {
          value = $filter('getTimestamp')(value);
          value = $filter('richOutput')(value);

          if (/<img src=/.test(value)) {
            var obj = {};
            obj.key = key;
            obj.value = value;
            images.push(obj);
            delete check.model[key];
          } else {
            check.model[key] = value;
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
    $scope.$on('$routeChangeSuccess', function(){
      getCheck();
    });
    $scope.$on('$routeUpdate', function(){
      getCheck();
    });

    // Services
    $scope.deleteClient = clientsService.deleteClient;
    $scope.resolveEvent = clientsService.resolveEvent;
    $scope.permalink = routingService.permalink;
    $scope.stash = stashesService.stash;
    $scope.user = userService;
    var searchCheckHistory = clientsService.searchCheckHistory;
    var searchEvent = clientsService.searchEvent;
  }
]);

/**
* Clients
*/
controllerModule.controller('ClientsController', ['clientsService', '$filter', 'filterService', 'helperService', '$rootScope', '$routeParams', 'routingService', '$scope', 'Sensu', 'stashesService', 'titleFactory', 'userService',
  function (clientsService, $filter, filterService, helperService, $rootScope, $routeParams, routingService, $scope, Sensu, stashesService, titleFactory, userService) {
    $scope.pageHeaderText = 'Clients';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = ['-status', 'name'];
    $scope.reverse = false;
    $scope.statuses = {0: 'Healthy', 1: 'Warning', 2: 'Critical', 3: 'Unknown'};

    // Get clients
    $scope.clients = [];
    var timer = Sensu.updateClients();
    $scope.$watch(function () { return Sensu.getClients(); }, function (data) {
      $scope.clients = _.map(data, function(client) {
        var existingClient = _.findWhere($scope.clients, {name: client.name, dc: client.dc});
        if (angular.isDefined(existingClient)) {
          if (angular.isUndefined(client.output) && angular.isDefined(existingClient.output)) {
            client.output = '';
          }
          client = angular.extend(existingClient, client);
        }
        return existingClient || client;
      });
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

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'subscription', 'limit', 'q', 'status']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.deleteClient = clientsService.deleteClient;
    $scope.filterComparator = filterService.comparator;
    $scope.go = routingService.go;
    $scope.openLink = helperService.openLink;
    $scope.permalink = routingService.permalink;
    $scope.stash = stashesService.stash;
    $scope.user = userService;

    $scope.selectClients = function(selectModel) {
      var filteredClients = $filter('filter')($scope.clients, $scope.filters.q);
      filteredClients = $filter('filter')(filteredClients, {dc: $scope.filters.dc});
      filteredClients = $filter('filter')(filteredClients, {status: $scope.filters.status});
      filteredClients = $filter('hideSilenced')(filteredClients, $scope.filters.silenced);
      _.each(filteredClients, function(client) {
        client.selected = selectModel.selected;
      });
    };

    $scope.deleteClients = function(clients) {
      var selectedClients = helperService.selectedItems(clients);
      _.each(selectedClients, function(client) {
        $scope.deleteClient(client.dc, client.name);
      });
    };

    $scope.silenceClients = function($event, clients) {
      var selectedClients = helperService.selectedItems(clients);
      $scope.stash($event, selectedClients);
    };

    $scope.$watch('filters.q', function(newVal) {
      var matched = $filter('filter')($scope.clients, '!'+newVal);
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.dc', function(newVal) {
      var matched = $filter('filter')($scope.clients, {dc: '!'+newVal});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.silenced', function() {
      var matched = $filter('filter')($scope.clients, {acknowledged: true});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.status', function(newVal) {
      var matched = $filter('filter')($scope.clients, {status: '!'+newVal});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });
  }
]);

/**
* Datacenters
*/
controllerModule.controller('DatacentersController', ['$scope', 'titleFactory',
  function ($scope, titleFactory) {
    $scope.pageHeaderText = 'Datacenters';
    titleFactory.set($scope.pageHeaderText);
  }
]);

/**
* Events
*/
controllerModule.controller('EventsController', ['clientsService', 'conf', '$cookieStore', '$filter', 'filterService', 'helperService', '$rootScope', '$routeParams','routingService', '$scope', 'Sensu', 'stashesService', 'titleFactory', 'userService',
  function (clientsService, conf, $cookieStore, $filter, filterService, helperService, $rootScope, $routeParams, routingService, $scope, Sensu, stashesService, titleFactory, userService) {
    $scope.pageHeaderText = 'Events';
    titleFactory.set($scope.pageHeaderText);

    $scope.filters = {};
    $scope.predicate = ['-check.status', '-check.issued'];
    $scope.reverse = false;
    $scope.statuses = {1: 'Warning', 2: 'Critical', 3: 'Unknown'};

    // Get events
    $scope.events = [];
    var timer = Sensu.updateEvents();
    $scope.$watch(function () { return Sensu.getEvents(); }, function (data) {
      if (angular.isObject(data)) {
        $scope.events = _.map(data, function(event) {
          if (event.client.name === null || event.check.name === null) {
            return;
          }
          event._id = event.dc + '/' + event.client.name + '/' + event.check.name;
          var existingEvent = _.findWhere($scope.events, {_id: event._id});
          if (existingEvent !== undefined) {
            event = angular.extend(existingEvent, event);
          }
          return existingEvent || event;
        });
      }
    });
    $scope.$on('$destroy', function() {
      Sensu.stop(timer);
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
    $scope.resolveEvent = clientsService.resolveEvent;
    $scope.stash = stashesService.stash;
    $scope.user = userService;

    // Hide silenced
    $scope.filters.silenced = $cookieStore.get('hideSilenced') || conf.hideSilenced;
    $scope.$watch('filters.silenced', function () {
      $cookieStore.put('hideSilenced', $scope.filters.silenced);
    });

    // Hide events from silenced clients
    $scope.filters.clientSilenced = $cookieStore.get('hideClientSilenced') || conf.hideClientSilenced;
    $scope.$watch('filters.clientSilenced', function () {
      $cookieStore.put('hideClientSilenced', $scope.filters.clientSilenced);
    });

    // Hide occurrences
    $scope.filters.occurrences = $cookieStore.get('hideOccurrences') || conf.hideOccurrences;
    $scope.$watch('filters.occurrences', function () {
      $cookieStore.put('hideOccurrences', $scope.filters.occurrences);
    });

    $scope.selectEvents = function(selectModel) {
      var filteredEvents = $filter('filter')($scope.events, $scope.filters.q);
      filteredEvents = $filter('filter')(filteredEvents, $scope.filters.check);
      filteredEvents = $filter('filter')(filteredEvents, {dc: $scope.filters.dc});
      filteredEvents = $filter('filter')(filteredEvents, {check: {status: $scope.filters.status}});
      filteredEvents = $filter('hideSilenced')(filteredEvents, $scope.filters.silenced);
      filteredEvents = $filter('hideClientSilenced')(filteredEvents, $scope.filters.clientSilenced);
      filteredEvents = $filter('hideOccurrences')(filteredEvents, $scope.filters.occurrences);
      _.each(filteredEvents, function(event) {
        event.selected = selectModel.selected;
      });
    };

    $scope.resolveEvents = function(events) {
      var selectedEvents = helperService.selectedItems(events);
      _.each(selectedEvents, function(event) {
        $scope.resolveEvent(event.check.name, event.client.name, event.dc);
      });
      helperService.unselectItems(selectedEvents);
    };

    $scope.silenceEvents = function($event, events) {
      var selectedEvents = helperService.selectedItems(events);
      $scope.stash($event, selectedEvents);
      helperService.unselectItems(selectedEvents);
    };

    $scope.$watch('filters.q', function(newVal) {
      var matched = $filter('filter')($scope.events, '!'+newVal);
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.dc', function(newVal) {
      var matched = $filter('filter')($scope.events, {dc: '!'+newVal});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.check', function(newVal) {
      var matched = $filter('filter')($scope.events, {check: '!'+newVal});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.status', function(newVal) {
      var matched = $filter('filter')($scope.events, {check: {status: '!'+newVal}});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.silenced', function() {
      var matched = $filter('filter')($scope.events, {acknowledged: true});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.clientSilenced', function() {
      var matched = $filter('filter')($scope.events.client, {acknowledged: true});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.occurrences', function() {
      var matched = $filter('filter')($scope.events, function(event) {
        if (('occurrences' in event.check) && !isNaN(event.check.occurrences)) {
          return event.occurrences >= event.check.occurrences;
        } else {
          return true;
        }
      });
      _.each(matched, function(match) {
        match.selected = false;
      });
    });
  }
]);

/**
* Info
*/
controllerModule.controller('InfoController', ['backendService', '$scope', 'titleFactory', 'version',
  function (backendService, $scope, titleFactory, version) {
    $scope.pageHeaderText = 'Info';
    titleFactory.set($scope.pageHeaderText);

    $scope.uchiwa = { version: version.uchiwa };
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
controllerModule.controller('SettingsController', ['$cookies', '$scope', 'titleFactory',
  function ($cookies, $scope, titleFactory) {
    $scope.pageHeaderText = 'Settings';
    titleFactory.set($scope.pageHeaderText);

    $scope.$watch('currentTheme', function (theme) {
      $scope.$emit('theme:changed', theme);
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

    $scope.clientsStyle = $scope.metrics.clients.critical > 0 ? 'critical' : $scope.metrics.clients.warning > 0 ? 'warning' : $scope.metrics.clients.unknown > 0 ? 'unknown' : 'success';
    $scope.eventsStyle = $scope.metrics.events.critical > 0 ? 'critical' : $scope.metrics.events.warning > 0 ? 'warning' : $scope.metrics.events.unknown > 0 ? 'unknown' : 'success';

    // Services
    $scope.user = userService;
    $scope.$watch('health', function () {
      navbarServices.health();
    });
  }
]);

/**
* Stashes
*/
controllerModule.controller('StashesController', ['filterService', '$routeParams', 'routingService', '$filter', '$rootScope', '$scope', 'Sensu', 'stashesService', 'titleFactory', 'userService', 'helperService',
  function (filterService, $routeParams, routingService, $filter, $rootScope, $scope, Sensu, stashesService, titleFactory, userService, helperService) {
    $scope.pageHeaderText = 'Stashes';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'client';
    $scope.reverse = false;
    $scope.selectAll = {checked: false};

    // Get stashes
    $scope.stashes = [];
    var timer = Sensu.updateStashes();
    $scope.$watch(function () { return Sensu.getStashes(); }, function (data) {
      $scope.stashes = data;
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
    $scope.deleteStash = stashesService.deleteStash;
    $scope.filterComparator = filterService.comparator;
    $scope.permalink = routingService.permalink;
    $scope.user = userService;

    $scope.selectStashes = function(selectAll) {
      var filteredStashes = $filter('filter')($scope.stashes, $scope.filters.q);
      filteredStashes = $filter('filter')(filteredStashes, {dc: $scope.filters.dc});
      _.each(filteredStashes, function(stash) {
        stash.selected = selectAll.checked;
      });
    };

    $scope.deleteStashes = function(stashes) {
      var selectedStashes = helperService.selectedItems(stashes);
      _.each(selectedStashes, function(stash) {
        $scope.deleteStash(stash);
      });
      helperService.unselectItems(selectedStashes);
      $scope.selectAll.checked = false;
    };
  }
]);

/**
* Stash Modal
*/
controllerModule.controller('StashModalController', ['conf', '$filter', 'items', '$modalInstance', 'notification', '$scope', 'stashesService',
  function (conf, $filter, items, $modalInstance, notification, $scope, stashesService) {
    $scope.items = items;
    $scope.acknowledged = $filter('filter')(items, {acknowledged: true}).length;
    $scope.itemType = items[0].hasOwnProperty('client') ? 'check' : 'client';
    $scope.stash = { 'content': {} };
    $scope.stash.expirations = {
      '900': 900,
      '3600': 3600,
      '86400': 86400,
      'none': -1,
      'custom': 'custom'
    };
    $scope.stash.reason = '';
    $scope.stash.expiration = 900;
    $scope.stash.content.to = moment().add(1, 'h').format(conf.date);


    $scope.ok = function () {
      if ($scope.stash.expiration === 'custom') {
        if (angular.isUndefined($scope.stash.content.to)) {
          notification('error', 'Please enter a date for the custom expiration.');
          return false;
        }
        $scope.stash = stashesService.getExpirationFromDateRange($scope.stash);
      }
      _.each(items, function(item) {
        stashesService.submit(item, $scope.stash);
      });
      $modalInstance.close();
    };
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };

    // Services
    $scope.findStash = stashesService.find;
    $scope.getPath = stashesService.getPath;
  }
]);
