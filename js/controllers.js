'use strict';

var controllerModule = angular.module('uchiwa.controllers', []);

/**
* Aggregate
*/
controllerModule.controller('AggregateController', ['Aggregates', '$rootScope', '$routeParams', 'routingService', '$scope', 'Sensu', 'titleFactory',
  function (Aggregates, $rootScope, $routeParams, routingService, $scope, Sensu, titleFactory) {
    $scope.pageHeaderText = 'Aggregates';
    titleFactory.set($scope.pageHeaderText);

    var detailsTimer;

    // Routing
    $scope.dc = decodeURI($routeParams.dc);
    $scope.name = decodeURI($routeParams.name);
    $scope.members = decodeURI($routeParams.members);
    $scope.severity = decodeURI($routeParams.severity);

    // Get aggregate
    $scope.aggregate = null;
    var timer = Sensu.updateAggregate($scope.name, $scope.dc);
    $scope.$watch(function () { return Sensu.getAggregate(); }, function (data) {
      $scope.aggregate = data;
    });
    $scope.$on('$destroy', function() {
      Sensu.stop(timer);
      Sensu.stop(detailsTimer);
      Sensu.cleanAggregate();
      Sensu.cleanAggregateDetails();
    });

    // Get check members
    if ($scope.members === 'checks') {
      detailsTimer = Sensu.updateAggregateChecks($scope.name, $scope.dc);
      $scope.$watch(function () { return Sensu.getAggregateChecks(); }, function (data) {
        $scope.checks = data;
      });
    } else if ($scope.members === 'clients') {
      detailsTimer = Sensu.updateAggregateClients($scope.name, $scope.dc);
      $scope.$watch(function () { return Sensu.getAggregateClients(); }, function (data) {
        $scope.clients = data;
      });
    } else if ($scope.members === 'results' && $scope.severity !== 'undefined') {
      detailsTimer = Sensu.updateAggregateResults($scope.name, $scope.severity, $scope.dc);
      $scope.$watch(function () { return Sensu.getAggregateResults(); }, function (data) {
        $scope.results = data;
      });
    }

    // Services
    $scope.delete = function(id) {
      Aggregates.delete(id)
        .then(function() {
          routingService.go('aggregates');
        }, function() {});
    };
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;
  }
]);

/**
* Aggregates
*/
controllerModule.controller('AggregatesController', ['Aggregates', '$filter', 'Helpers', 'Notification', '$routeParams', 'routingService', '$scope', 'Sensu', 'titleFactory',
  function (Aggregates, $filter, Helpers, Notification, $routeParams, routingService, $scope, Sensu, titleFactory) {
    $scope.pageHeaderText = 'Aggregates';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'check';
    $scope.reverse = false;
    $scope.selected = {all: false, ids: {}};

    // Filters
    var updateFilters = function() {
      var filtered = $filter('filter')($scope.aggregates, {dc: $scope.filters.dc}, Helpers.equals);
      filtered = $filter('filter')(filtered, $scope.filters.q);
      filtered = $filter('collection')(filtered, 'aggregates');
      $scope.filtered = filtered;
    };

    $scope.$watchGroup(['collection.search', 'filters.q', 'filters.dc'], function() {
      updateFilters();
    });

    // Get aggregates
    $scope.aggregates = [];
    var timer = Sensu.updateAggregates();
    $scope.$watch(function () { return Sensu.getAggregates(); }, function (data) {
      $scope.aggregates = data;
      updateFilters();
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
    $scope.delete = function($event, id) {
      $event.stopPropagation();
      Aggregates.deleteSingle(id)
        .then(function() {
          $scope.filtered = Helpers.removeItemById(id, $scope.filtered);
        }, function() {});
    };

    $scope.deleteMultiple = function() {
      Aggregates.deleteMultiple($scope.filtered, $scope.selected)
        .then(function(results) {
          $scope.filtered = results;
        }, function() {});
    };

    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;
    $scope.selectAll = Helpers.selectAll;
  }
]);

/**
* Checks
*/
controllerModule.controller('ChecksController', ['Checks', '$filter', 'Helpers', '$routeParams', 'routingService', '$scope', 'Sensu', 'Silenced', 'titleFactory',
  function (Checks, $filter, Helpers, $routeParams, routingService, $scope, Sensu, Silenced, titleFactory) {
    $scope.pageHeaderText = 'Checks';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'name';
    $scope.reverse = false;
    $scope.selected = {all: false, ids: {}};

    var updateFilters = function() {
      var filtered = $filter('filter')($scope.checks, {dc: $scope.filters.dc}, Helpers.equals);
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
      Helpers.updateSelected(newValues, oldValues, $scope.filtered, $scope.selected);
    });

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'limit', 'q']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.permalink = routingService.permalink;
    $scope.selectAll = Helpers.selectAll;
    $scope.issueCheckRequest = function() {
      Checks.issueMulipleCheckRequest($scope.filtered, $scope.selected);
    };
    $scope.silenceChecks = function() {
      Checks.silence($scope.filtered, $scope.selected);
    };
  }
]);

/**
* Client
*/
controllerModule.controller('ClientController', ['Clients', '$filter', '$location', '$routeParams', 'routingService', '$scope', 'Sensu', 'titleFactory', 'userService',
  function (Clients, $filter, $location, $routeParams, routingService, $scope, Sensu, titleFactory, userService) {
    $scope.predicate = '-last_status';
    $scope.reverse = false;

    // Routing
    $scope.clientName = decodeURI($routeParams.client);
    $scope.dc = decodeURI($routeParams.dc);

    var searchCheckHistory = Clients.searchCheckHistory;

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

          // Issue 558: do not move an image from the command attribute to its own box
          if (key !== 'command') {
            value = $filter('richOutput')(value);
          }

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
    $scope.deleteCheckResult = Clients.deleteCheckResult;
    $scope.delete = function(id) {
      Clients.delete(id)
        .then(function() {
          routingService.go('clients');
        }, function() {});
    };
    $scope.resolveEvent = function(id) {
      Clients.resolveEvent(id)
        .then(function() {
          delete $location.$$search.check;
          $location.$$compose();
        }, function() {});
    };
    $scope.permalink = routingService.permalink;
    $scope.silence = function() {
      Clients.silence($scope.filtered, $scope.selected);
    };
    $scope.user = userService;
  }
]);

/**
* Clients
*/
controllerModule.controller('ClientsController', ['Clients', '$filter', 'Helpers', '$rootScope', '$routeParams', 'routingService', '$scope', 'Sensu', 'Silenced', 'titleFactory', 'userService',
  function (Clients, $filter, Helpers, $rootScope, $routeParams, routingService, $scope, Sensu, Silenced, titleFactory, userService) {
    $scope.pageHeaderText = 'Clients';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = ['-status', 'name'];
    $scope.reverse = false;
    $scope.selected = {all: false, ids: {}};
    $scope.statuses = {0: 'Healthy', 1: 'Warning', 2: 'Critical', 3: 'Unknown'};

    var updateFilters = function() {
      var filtered = $filter('filter')($scope.clients, {dc: $scope.filters.dc}, Helpers.equals);
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
      Helpers.updateSelected(newValues, oldValues, $scope.filtered, $scope.selected);
    });

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'subscription', 'limit', 'q', 'status']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.delete = function() {
      Clients.deleteMultiple($scope.filtered, $scope.selected)
        .then(function(results) {
          $scope.filtered = results;
        }, function() {});
    };
    $scope.go = routingService.go;
    $scope.openLink = Helpers.openLink;
    $scope.permalink = routingService.permalink;
    $scope.selectAll = Helpers.selectAll;
    $scope.silence = Silenced.create;
    $scope.silenceClients = function() {
      Clients.silence($scope.filtered, $scope.selected);
    };
    $scope.user = userService;
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
controllerModule.controller('EventsController', ['Clients', 'conf', '$cookieStore', 'Events', '$filter', 'Helpers', '$rootScope', '$routeParams','routingService', '$scope', 'Sensu', 'Silenced', 'titleFactory', 'userService',
  function (Clients, conf, $cookieStore, Events, $filter, Helpers, $rootScope, $routeParams, routingService, $scope, Sensu, Silenced, titleFactory, userService) {
    $scope.pageHeaderText = 'Events';
    titleFactory.set($scope.pageHeaderText);

    $scope.filters = {};
    $scope.predicate = ['-check.status', '-check.issued'];
    $scope.reverse = false;
    $scope.selected = {all: false, ids: {}};
    $scope.statuses = {1: 'Warning', 2: 'Critical', 3: 'Unknown'};

    var updateFilters = function() {
      var filtered = $filter('filter')($scope.events, {dc: $scope.filters.dc}, Helpers.equals);
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
      Helpers.updateSelected(newValues, oldValues, $scope.filtered, $scope.selected);
    });

    // Routing
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'check', 'limit', 'q', 'status']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.go = routingService.go;
    $scope.openLink = Helpers.openLink;
    $scope.permalink = routingService.permalink;
    $scope.selectAll = Helpers.selectAll;
    $scope.silence = Silenced.create;
    $scope.user = userService;
    $scope.resolveEvents = function() {
      Events.resolveMultiple($scope.filtered, $scope.selected)
        .then(function(results) {
          $scope.filtered = results;
        }, function() {});
    };
    $scope.silenceEvents = function() {
      Events.silence($scope.filtered, $scope.selected);
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
controllerModule.controller('LoginController', ['audit', 'backendService', '$cookieStore', '$location', '$rootScope', '$scope',
function (audit, backendService, $cookieStore, $location, $rootScope, $scope) {

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
      //notification('error', 'There was an error with your username/password combination. Please try again.');
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
controllerModule.controller('NavbarController', ['audit', '$location', '$rootScope', '$scope', 'routingService', 'userService',
  function (audit, $location, $rootScope, $scope, routingService, userService) {

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
controllerModule.controller('SidebarController', ['$location', '$rootScope', '$sce', '$scope', 'userService',
  function ($location, $rootScope, $sce, $scope, userService) {
    // Get CSS class for sidebar elements
    $scope.getClass = function(path) {
      if ($location.path().substr(0, path.length) === path) {
        return 'selected';
      } else {
        return '';
      }
    };

    $scope.popoversTemplates = {
      aggregates: $rootScope.partialsPath + '/popovers/aggregates.html',
      checks: $rootScope.partialsPath + '/popovers/checks.html',
      clients: $rootScope.partialsPath + '/popovers/clients.html',
      datacenters: $rootScope.partialsPath + '/popovers/datacenters.html',
      events: $rootScope.partialsPath + '/popovers/events.html',
      silenced: $rootScope.partialsPath + '/popovers/silenced.html',
      stashes: $rootScope.partialsPath + '/popovers/stashes.html'
    };

    $scope.$watch('metrics', function() {
      if (angular.isObject($scope.metrics) && angular.isDefined($scope.metrics.clients)) {
        $scope.clientsStyle = $scope.metrics.clients.critical > 0 ? 'critical' : $scope.metrics.clients.warning > 0 ? 'warning' : $scope.metrics.clients.unknown > 0 ? 'unknown' : $scope.metrics.clients.silenced > 0 ? 'silenced' : 'success';
        $scope.eventsStyle = $scope.metrics.events.critical > 0 ? 'critical' : $scope.metrics.events.warning > 0 ? 'warning' : $scope.metrics.events.unknown > 0 ? 'unknown' : $scope.metrics.events.silenced > 0 ? 'silenced' : 'success';
      }
      else {
        $scope.clientsStyle = 'unknown';
        $scope.eventsStyle = 'unknown';
      }
    });

    // Services
    $scope.user = userService;
  }
]);

/**
* Silenced
*/
controllerModule.controller('SilencedController', ['$filter', 'Helpers', '$routeParams', 'routingService', '$scope', 'Sensu', 'Silenced', 'titleFactory', 'userService',
  function ($filter, Helpers, $routeParams, routingService, $scope, Sensu, Silenced, titleFactory, userService) {
    $scope.pageHeaderText = 'Silenced';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'id';
    $scope.reverse = false;
    $scope.selectAll = {checked: false};
    $scope.selected = {all: false, ids: {}};

    var updateFilters = function() {
      var filtered = $filter('filter')($scope.silenced, {dc: $scope.filters.dc}, Helpers.equals);
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
      Helpers.updateSelected(newValues, oldValues, $scope.filtered, $scope.selected);
    });

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'limit', 'q']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;
    $scope.selectAll = Helpers.selectAll;
    $scope.silence = Silenced.create;
    $scope.user = userService;
    $scope.delete = function($event, id) {
      $event.stopPropagation();
      Silenced.deleteSingle(id)
        .then(function() {
          $scope.filtered = Helpers.removeItemById(id, $scope.filtered);
        }, function() {});
    };
    $scope.deleteMultiple = function() {
      Silenced.deleteMultiple($scope.filtered, $scope.selected)
        .then(function(results) {
          $scope.filtered = results;
        }, function() {});
    };
  }
]);

/**
* Silenced Entry
*/
controllerModule.controller('SilencedEntryController', ['Helpers', '$routeParams', 'routingService', '$scope', 'Sensu', 'Silenced', 'titleFactory',
  function (Helpers, $routeParams, routingService, $scope, Sensu, Silenced, titleFactory) {
    // Routing
    $scope.id = decodeURI($routeParams.id);
    titleFactory.set($scope.id);

    // Get the stash
    $scope.entry = null;

    // Get silenced entries
    Silenced.query().$promise.then(
      function(results) {
        $scope.entry = Helpers.findIdInItems($scope.id, results);
      }
    );

    // Get health and metrics
    var timer = Sensu.updateMetrics();
    $scope.$on('$destroy', function() {
      Sensu.stop(timer);
    });

    $scope.delete = function($event, id) {
      $event.stopPropagation();
      Silenced.deleteSingle(id)
        .then(function() {
          routingService.go('/silenced');
        }, function() {});
    };
  }
]);

/**
* Silenced Modal
*/
controllerModule.controller('SilencedModalController', ['backendService', 'conf', '$filter', 'Helpers', 'items', 'Notification', '$q', '$rootScope', '$scope', 'Sensu', 'Silenced', 'Subscriptions', '$uibModalInstance',
  function (backendService, conf, $filter, Helpers, items, Notification, $q, $rootScope, $scope, Sensu, Silenced, Subscriptions, $uibModalInstance) {
    $scope.items = items;
    $scope.silencedCount = $filter('filter')(items, {silenced: true}).length;
    if (angular.isDefined(items[0])) {
      $scope.itemType = items[0].hasOwnProperty('version') ? 'client' : 'check';
    } else {
      $scope.itemType = 'subscription';
    }

    $scope.entries = [];
    $scope.options = {ac: {}, expire: 900, reason: '', to: moment().add(1, 'h').format(conf.date)};

    // Get silenced entries
    Silenced.query().$promise.then(
      function(results) {
        $scope.entries = Silenced.findEntriesFromItems(results, items);
      }
    );

    // Get subscriptions
    Subscriptions.query().$promise.then(
      function(results) {
        $scope.subscriptions = results;
      }
    );

    $scope.ok = function() {
      if ($scope.options.expire === 'custom') {
        if (angular.isUndefined($scope.options.to)) {
          Notification.error('Please enter a date for the custom expiration.');
          return false;
        }
      }

      // Silenced entries to clear
      if ($scope.entries.length !== 0) {
        Silenced.clearEntries($scope.entries).then(
          function(results) {
            $uibModalInstance.close();
            if (results.length === 1) {
              Notification.success('The silenced entry '+ results[0].id +' has been cleared');
              return;
            }
            Notification.success(results.length + ' silenced entries have been cleared');
          },
          function(results) {
            if (results.length === 1) {
              Notification.error('Could not clear the silenced entry ' + results[0].id );
              return;
            }
            Notification.error('Could not clear all of the silenced entries');
          }
        );
      }

      // Silenced entries to create
      Silenced.createEntries(items, $scope.itemType, $scope.options).then(
        function(results) {
          $uibModalInstance.close();
          if (results.length === 1) {
            Notification.success('The silenced entry has been created');
          } else if (results.length > 1) {
            Notification.success(results.length + ' silenced entries have been created');
          }
        },
        function(results) {
          if (results.length === 1) {
            Notification.error('Could not create the silenced entry ' + results[0].id );
            return;
          } else if (results.length > 1) {
            Notification.error('Could not create all of the silenced entries');
          }
        }
      );
    };
    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };

    // Autocompletion
    function suggestSubscription(term) {
      var q = term.toLowerCase().trim();
      var results = [];
      // Find first 10 entries that start with `term`.
      for (var i = 0; i < $scope.subscriptions.length && $scope.subscriptions.length < 10; i++) {
        var subscription = $scope.subscriptions[i];
        if (subscription.name.toLowerCase().indexOf(q) === 0 && subscription.dc === $scope.options.ac.dc) {
          results.push({ label: subscription.name, value: subscription.name });
        }
      }
      return results;
    }

    $scope.autocompleteSubscription = {
      suggest: suggestSubscription
    };
  }
]);

/**
* Stash
*/
controllerModule.controller('StashController', [ 'backendService', '$filter', '$routeParams', '$scope', 'Sensu', 'Stashes', 'titleFactory',
  function (backendService, $filter, $routeParams, $scope, Sensu, Stashes, titleFactory) {
    // Routing
    $scope.id = decodeURI($routeParams.id);
    titleFactory.set($scope.id);

    // Get the stash
    $scope.stash = null;
    var stashes = [];
    backendService.getStashes()
      .success(function (data) {
        stashes = data;

        var stash = Stashes.get(stashes, $scope.id);
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
controllerModule.controller('StashesController', ['$filter', 'Helpers', '$rootScope', '$routeParams', 'routingService', '$scope', 'Sensu', 'Stashes', 'titleFactory', 'userService',
  function ($filter, Helpers, $rootScope, $routeParams, routingService, $scope, Sensu, Stashes, titleFactory, userService) {
    $scope.pageHeaderText = 'Stashes';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'client';
    $scope.reverse = false;
    $scope.selectAll = {checked: false};
    $scope.selected = {all: false, ids: {}};

    var updateFilters = function() {
      var filtered = $filter('filter')($scope.stashes, {dc: $scope.filters.dc}, Helpers.equals);
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
      Helpers.updateSelected(newValues, oldValues, $scope.filtered, $scope.selected);
    });

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'limit', 'q']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;
    $scope.selectAll = Helpers.selectAll;
    $scope.user = userService;
    $scope.delete = function($event, id) {
      $event.stopPropagation();
      Stashes.deleteSingle(id)
        .then(function() {
          $scope.filtered = Helpers.removeItemById(id, $scope.filtered);
        }, function() {});
    };

    $scope.deleteMultiple = function() {
      Stashes.deleteMultiple($scope.filtered, $scope.selected)
        .then(function(results) {
          $scope.filtered = results;
        }, function() {});
    };
  }
]);
