'use strict';

var controllerModule = angular.module('uchiwa.controllers', []);

/**
* Checks
*/
controllerModule.controller('checks', ['titleFactory', '$routeParams', 'routingService', '$scope',
  function (titleFactory, $routeParams, routingService, $scope) {
    $scope.pageHeaderText = 'Checks';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'name';

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
    $scope.permalink = routingService.permalink;

  }
]);

/**
* Client
*/
controllerModule.controller('client', ['backendService', 'clientsService', 'conf', 'notification', 'titleFactory', '$routeParams', 'routingService', '$scope','stashesService', 'userService',
  function (backendService, clientsService, conf, notification, titleFactory, $routeParams, routingService, $scope, stashesService, userService) {

    $scope.predicate = '-last_status';
    $scope.missingClient = false;

    // Retrieve client
    $scope.clientId = decodeURI($routeParams.clientId);
    $scope.dcId = decodeURI($routeParams.dcId);
    $scope.pull = function() {
      backendService.getClient($scope.clientId, $scope.dcId)
        .success(function (data) {
          $scope.$emit('client', data);
        })
        .error(function (error) {
          // Stop the pulling interval and set scope to display an error message
          clearTimeout(timer);
          $scope.missingClient = true;
          console.error('Error: '+ JSON.stringify(error));
        });
    };

    $scope.pull();
    var timer = setInterval($scope.pull, conf.refresh);

    $scope.$on('client', function (event, data) {
      $scope.client = data;
      $scope.pageHeaderText = $scope.client.name;

      // Retrieve check & event
      $scope.requestedCheck = decodeURI($routeParams.check);
      $scope.selectedCheck = getCheck($scope.requestedCheck, $scope.client.history);
      $scope.selectedEvent = getEvent($scope.client.name, $scope.requestedCheck, $scope.events);

      // Set page titleFactory
      if(angular.isDefined($scope.selectedCheck)) {
        titleFactory.set($scope.requestedCheck + ' - ' + $scope.client.name);
      }
      else {
        titleFactory.set($scope.client.name);
      }
    });

    // Routing
    $scope.$on('$routeUpdate', function(){
      // Retrieve check & event
      $scope.requestedCheck = decodeURI($routeParams.check);
      $scope.selectedCheck = getCheck($scope.requestedCheck, $scope.client.history);
      $scope.selectedEvent = getEvent($scope.client.name, $scope.requestedCheck, $scope.events);

      if(angular.isDefined($scope.selectedCheck)) {
        titleFactory.set($scope.requestedCheck + ' - ' + $scope.client.name);
      }
      else {
        titleFactory.set($scope.client.name);
      }
    });

    $scope.$on('$destroy', function() {
      clearInterval(timer);
    });

    // Sanitize - only display useful information 'acknowledged', 'dc', 'events', 'eventsSummary', 'history', 'status', 'timestamp'
    /* jshint ignore:start */
    var clientWhitelist = [ 'acknowledged', 'dc', 'events', 'eventsSummary', 'history', 'output', 'status', 'timestamp' ];
    var checkWhitelist = [ 'dc', 'hasSubscribers', 'name'];
    $scope.sanitizeObject = function(type, key){
      return eval(type + 'Whitelist').indexOf(key) === -1;
    };
    /* jshint ignore:end */

    // Services
    $scope.deleteClient = clientsService.deleteClient;
    $scope.resolveEvent = clientsService.resolveEvent;
    $scope.permalink = routingService.permalink;
    $scope.stash = stashesService.stash;
    $scope.user = userService;
    var getCheck = clientsService.getCheck;
    var getEvent = clientsService.getEvent;
  }
]);

/**
* Clients
*/
controllerModule.controller('clients', ['clientsService', '$filter', 'helperService', '$rootScope', '$routeParams', 'routingService', '$scope', 'stashesService', 'titleFactory', 'userService',
  function (clientsService, $filter, helperService, $rootScope, $routeParams, routingService, $scope, stashesService, titleFactory, userService) {
    $scope.pageHeaderText = 'Clients';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = '-status';

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'subscription', 'limit', 'q']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.deleteClient = clientsService.deleteClient;
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;
    $scope.stash = stashesService.stash;
    $scope.user = userService;

    $scope.selectClients = function(selectModel) {
      var filteredClients = $filter('filter')($rootScope.clients, $scope.filters.q);
      filteredClients = $filter('filter')(filteredClients, {dc: $scope.filters.dc});
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
      var matched = $filter('filter')($rootScope.clients, '!'+newVal);
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.dc', function(newVal) {
      var matched = $filter('filter')($rootScope.clients, {dc: '!'+newVal});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.silenced', function() {
      var matched = $filter('filter')($rootScope.clients, {acknowledged: true});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });
  }
]);

/**
* Events
*/
controllerModule.controller('events', ['clientsService', 'conf', '$cookieStore', '$filter', 'helperService', '$rootScope', '$routeParams','routingService', '$scope', 'stashesService', 'titleFactory', 'userService',
  function (clientsService, conf, $cookieStore, $filter, helperService, $rootScope, $routeParams, routingService, $scope, stashesService, titleFactory, userService) {
    $scope.pageHeaderText = 'Events';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = '-check.status';
    $scope.filters = {};

    // Routing
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'limit', 'q']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.go = routingService.go;
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
      var filteredEvents = $filter('filter')($rootScope.events, $scope.filters.q);
      filteredEvents = $filter('filter')(filteredEvents, {dc: $scope.filters.dc});
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
        $scope.resolveEvent(event.dc, event.client, event.check);
      });
    };

    $scope.silenceEvents = function($event, events) {
      var selectedEvents = helperService.selectedItems(events);
      $scope.stash($event, selectedEvents);
    };

    $scope.$watch('filters.q', function(newVal) {
      var matched = $filter('filter')($rootScope.events, '!'+newVal);
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.dc', function(newVal) {
      var matched = $filter('filter')($rootScope.events, {dc: '!'+newVal});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.silenced', function() {
      var matched = $filter('filter')($rootScope.events, {acknowledged: true});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.clientSilenced', function() {
      var matched = $filter('filter')($rootScope.events.client, {acknowledged: true});
      _.each(matched, function(match) {
        match.selected = false;
      });
    });

    $scope.$watch('filters.occurrences', function() {
      var matched = $filter('filter')($rootScope.events, function(event) {
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
controllerModule.controller('info', ['backendService', '$scope', 'titleFactory', 'version',
  function (backendService, $scope, titleFactory, version) {
    $scope.pageHeaderText = 'Info';
    titleFactory.set($scope.pageHeaderText);

    $scope.uchiwa = { version: version.uchiwa };
  }
]);

/**
* Login
*/
controllerModule.controller('login', [ 'backendService', '$cookieStore', '$location', 'notification', '$rootScope', '$scope',
function (backendService, $cookieStore, $location, notification, $rootScope, $scope) {

  $scope.login = {user: '', pass: ''};

  $scope.submit = function () {
    backendService.login($scope.login)
    .success(function (data) {
      $cookieStore.put('uchiwa_auth', data);
      backendService.getConfig();
      $location.path('/');
    })
    .error(function () {
      notification('error', 'There was an error with your username/password combination. Please try again.');
    });
  };

  if (angular.isObject($rootScope.auth) || angular.isObject($rootScope.config)) {
    $location.path('/');
  }
}
]);

/**
* Navbar
*/
controllerModule.controller('navbar', ['$rootScope', '$scope', 'navbarServices', 'routingService',
  function ($rootScope, $scope, navbarServices, routingService) {

    // Services
    $scope.go = routingService.go;
    $scope.$on('sensu', function () {
      // Update badges
      navbarServices.countStatuses('clients', function (item) {
        return item.status;
      });
      navbarServices.countStatuses('events', function (item) {
        return item.check.status;
      });

      // Update alert badge
      navbarServices.health();
    });

  }
]);

/**
* Settings
*/
controllerModule.controller('settings', ['$cookies', '$scope', 'titleFactory',
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
controllerModule.controller('sidebar', ['$location', '$scope', 'userService',
  function ($location, $scope, userService) {
    $scope.getClass = function(path) {
      if ($location.path().substr(0, path.length) === path) {
        return 'selected';
      } else {
        return '';
      }
    };

    $scope.logout = userService.logout;
    $scope.user = userService;
  }
]);

/**
* Aggregates
*/
controllerModule.controller('aggregates', ['$scope', '$routeParams', 'routingService', 'titleFactory',
  function ($scope, $routeParams, routingService, titleFactory) {
    $scope.pageHeaderText = 'Aggregates';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'check';

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'limit', 'q']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;
  }
]);

/**
* Aggregates for Check
*/
controllerModule.controller('check_aggregates', ['$rootScope', '$scope', '$routeParams', 'routingService', 'titleFactory',
  function ($rootScope, $scope, $routeParams, routingService, titleFactory) {
    $scope.pageHeaderText = 'Aggregates';
    titleFactory.set($scope.pageHeaderText);

    // Services
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;

    $scope.dcId = decodeURI($routeParams.dcId);
    $scope.checkId = decodeURI($routeParams.checkId);

    $scope.$on('sensu', function() {
      $scope.check_aggregates = _.find($rootScope.aggregates, function(aggregate) { // jshint ignore:line
        return $scope.checkId === aggregate.check && $scope.dcId === aggregate.dc;
      });
    });
  }
]);

/**
* Aggregates for Issue within Check
*/
controllerModule.controller('check_issue_aggregates', ['$scope', '$http', '$routeParams', 'routingService', 'titleFactory',
  function ($scope, $http, $routeParams, routingService, titleFactory) {
    $scope.pageHeaderText = 'Aggregates';
    titleFactory.set($scope.pageHeaderText);

    // Services
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;

    $scope.dcId = decodeURI($routeParams.dcId);
    $scope.checkId = decodeURI($routeParams.checkId);
    $scope.issuedId = decodeURI($routeParams.issuedId);

    $http.get('get_aggregate_by_issued?check=' + $scope.checkId + '&issued=' + $scope.issuedId + '&dc=' + $scope.dcId)
    .success(function(data) {
      $scope.aggregate = data;
    })
    .error(function(error) {
      console.log('Error: ' + JSON.stringify(error));
    });
  }
]);

/**
* Stashes
*/
controllerModule.controller('stashes', ['$scope', '$routeParams', 'routingService', 'stashesService', 'titleFactory', 'userService',
  function ($scope, $routeParams, routingService, stashesService, titleFactory, userService) {
    $scope.pageHeaderText = 'Stashes';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'client';
    $scope.deleteStash = stashesService.deleteStash;

    // Routing
    $scope.filters = {};
    routingService.initFilters($routeParams, $scope.filters, ['dc', 'limit', 'q']);
    $scope.$on('$locationChangeSuccess', function(){
      routingService.updateFilters($routeParams, $scope.filters);
    });

    // Services
    $scope.permalink = routingService.permalink;
    $scope.user = userService;
  }
]);

/**
* Stash Modal
*/
controllerModule.controller('StashModalCtrl', ['conf', '$filter', 'items', '$modalInstance', 'notification', '$scope', 'stashesService',
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
    $scope.stash.content.from = moment().format(conf.date);

    function calculateToFrom() {
      if ($scope.stash.content && ($scope.stash.content.to && $scope.stash.content.from)) {
        $scope.stash.content.timestamp = new Date($scope.stash.content.from).getTime() / 1000;
        $scope.stash.expiration = (new Date($scope.stash.content.to).getTime() -
        new Date($scope.stash.content.from).getTime()) / 1000;
        $scope.stash.content.to = null;
        return true;
      }
      else {
        return false;
      }
    }

    $scope.stashForItem = function(stashes, item) {
      var path = 'silence/';

      if ($scope.itemType === 'client') {
        path = path + item.name;
      } else if ($scope.itemType === 'check') {
        path = path + item.client.name + '/' + item.check.name;
      }

      return _.findWhere(stashes, {
        dc: item.dc,
        path: path
      });
    };

    $scope.ok = function () {
      if ($scope.stash.expiration === 'custom' && !calculateToFrom()) {
        notification('error', 'Please enter both from and to values.');
        return false;
      }
      _.each(items, function(item) {
        stashesService.submit(item, $scope.stash);
      });
      $modalInstance.close();
    };
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  }
]);
