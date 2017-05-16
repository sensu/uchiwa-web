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
      filtered = $filter('regex')(filtered, $scope.filters.q);
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
    $scope.hasElementSelected = Helpers.hasElementSelected;
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;
    $scope.selectAll = Helpers.selectAll;
  }
]);

/**
* Check
*/
controllerModule.controller('CheckController', ['Check', '$rootScope', '$routeParams', 'routingService', '$scope', 'Silenced', 'titleFactory',
  function (Check, $rootScope, $routeParams, routingService, $scope, Silenced, titleFactory) {
    // Routing
    $scope.dc = decodeURI($routeParams.dc);
    $scope.name = decodeURI($routeParams.name);
    $scope.pageHeaderText = $scope.name;
    titleFactory.set($scope.pageHeaderText);

    // Get the check
    $scope.check = Check.check;
    Check.realTime($scope.dc, $scope.name);
    $scope.$on('$destroy', function() {
      Check.stop();
    });

    // Services
    $scope.issueCheckRequest = Check.issueCheckRequest;
    $scope.silence = Silenced.create;
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
      filtered = $filter('regex')(filtered, $scope.filters.q);
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
    $scope.go = routingService.go;
    $scope.hasElementSelected = Helpers.hasElementSelected;
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
controllerModule.controller('ClientController', ['Clients', '$filter', 'Helpers', '$location', '$rootScope', '$routeParams', 'routingService', '$scope', 'Sensu', 'Silenced', 'titleFactory', '$uibModal', 'User',
  function (Clients, $filter, Helpers, $location, $rootScope, $routeParams, routingService, $scope, Sensu, Silenced, titleFactory, $uibModal, User) {
    $scope.predicate = '-last_status';
    $scope.reverse = false;
    $scope.check = null;
    $scope.images = null;

    // Routing
    $scope.clientName = decodeURI($routeParams.client);
    $scope.dc = decodeURI($routeParams.dc);

    // Get check
    var getCheck = function() {
      Clients.findCheckHistory($scope.client.history, $routeParams.check)
      .then(function(check) {
        // Add the history to the last_result hash
        check.last_result.history = check.history; // jshint ignore:line
        $scope.check = check;
        titleFactory.set(check.check + ': ' + $scope.client.name);
        return Clients.richOutput(check.last_result); // jshint ignore:line
      }, function() {
        // If we have an error with findCheckHistory
        titleFactory.set($scope.client.name);
        $scope.check = null;
      }).then(function(lastResult) {
        $scope.lastResult = lastResult;
        return Clients.findPanels($scope.lastResult);
      }, function() {
        // If we have an error with richOutput
        $scope.check = null;
        $scope.lastResult = null;
      }).then(function(images) {
        $scope.images = images;
      }, function() {
        // If we have an error with findPanels
        $scope.images = null;
      });
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
    $scope.edit = function(client) {
      var modalInstance = $uibModal.open({ // jshint ignore:line
        templateUrl: $rootScope.partialsPath + '/modals/clientregistry/index.html' + $rootScope.versionParam,
        controller: 'ClientRegistryModalController',
        resolve: {
          client: function () {
            return client;
          }
        }
      });
    };
    $scope.isUrl = Helpers.isUrl;
    $scope.resolveEvent = function(id) {
      Clients.resolveEvent(id)
        .then(function() {
          delete $location.$$search.check;
          $location.$$compose();
        }, function() {});
    };
    $scope.permalink = routingService.permalink;
    $scope.silence = Silenced.create;
    $scope.user = User;
  }
]);

/**
* Client Creation
*/
controllerModule.controller('ClientCreationModalController', ['Client', 'Notification', '$scope', '$uibModalInstance',
  function (Client, Notification, $scope, $uibModalInstance) {
    $scope.obj = {
      data: {
        name: '',
        address: '',
        keepalives: false,
        subscriptions: []
      },
      options: {mode: 'code'}
    };

    $scope.datacenter = {selected: ''};

    // If we only have one datacenter, it should set to it by default
    $scope.$watch('datacenters', function(dc) {
      if(angular.isArray(dc) && dc.length === 1) {
        $scope.datacenter.selected = dc[0].name;
      }
    });

    $scope.ok = function() {
      // Verify that the datacenter was added
      if (angular.isUndefined($scope.datacenter.selected) || $scope.datacenter.selected === '') {
        Notification.error('Please select a datacenter');
        return false;
      }

      // Verify that a name was provided
      if (angular.isUndefined($scope.obj.data.name) || $scope.obj.data.name === '') {
        Notification.error('Please enter a name for the client');
        return false;
      }

      // Verify that an address was provided
      if (angular.isUndefined($scope.obj.data.address) || $scope.obj.data.address === '') {
        Notification.error('Please enter the address of the client');
        return false;
      }

      // Verify that at least one subscription was provided
      if (angular.isUndefined($scope.obj.data.subscriptions) || !angular.isArray($scope.obj.data.subscriptions) || $scope.obj.data.subscriptions.length <= 0) {
        Notification.error('Please provide at least one subscription');
        return false;
      }

      var payload = angular.copy($scope.obj.data);

      // Add back the datacenter
      payload.dc = $scope.datacenter.selected;

      Client.update(payload)
      .then(
        function() {
          Notification.success('The client has been created');
          $uibModalInstance.close();
        },
        function(error) {
          console.error(error);
          Notification.error('Could not create the client. ' + error.data);
        }
      );
    };

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };
  }
]);

/**
* Client Registry
*/
controllerModule.controller('ClientRegistryModalController', ['Client', 'client', 'Notification', '$scope', '$uibModalInstance',
  function (Client, client, Notification, $scope, $uibModalInstance) {
    // Create a deep copy of the client
    var selectedClient = angular.copy(client);

    // Save the datacenter for later
    var dc = client.dc;

    // Display the client name
    $scope.name = client.name;

    // Remove internal attributes
    delete selectedClient._id;
    delete selectedClient.dc;
    delete selectedClient.history;
    delete selectedClient.silenced;
    delete selectedClient.timestamp;
    delete selectedClient.version;

    $scope.obj = {data: selectedClient, options: {mode: 'code'}};

    $scope.ok = function() {
      // Add back the datacenter
      var payload = $scope.obj.data;
      payload.dc = dc;

      Client.update(payload)
      .then(
        function() {
          Notification.success('The client has been updated');
          $uibModalInstance.close();
        },
        function(error) {
          Notification.error('Could not update the client. ' + error.data);
        }
      );
    };

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };

  }
]);

/**
* Clients
*/
controllerModule.controller('ClientsController', ['Clients', '$filter', 'Helpers', '$rootScope', '$routeParams', 'routingService', '$scope', 'Sensu', 'Silenced', 'titleFactory', '$uibModal', 'User',
  function (Clients, $filter, Helpers, $rootScope, $routeParams, routingService, $scope, Sensu, Silenced, titleFactory, $uibModal, User) {
    $scope.pageHeaderText = 'Clients';
    titleFactory.set($scope.pageHeaderText);
    $scope.predicate = ['-status', 'name'];
    $scope.reverse = false;
    $scope.selected = {all: false, ids: {}};
    $scope.statuses = {0: 'Healthy', '!0': 'Not Healthy', 1: 'Warning', 2: 'Critical', 3: 'Unknown'};

    var updateFilters = function() {
      var filtered = $filter('filter')($scope.clients, {dc: $scope.filters.dc}, Helpers.equals);
      // filtered = $filter('filter')(filtered, {status: $scope.filters.status});
      filtered = $filter('filterSubscriptions')(filtered, $scope.filters.subscription);
      filtered = $filter('regex')(filtered, $scope.filters.q);
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
    $scope.create = function() {
      var modalInstance = $uibModal.open({ // jshint ignore:line
        templateUrl: $rootScope.partialsPath + '/modals/clientcreation/index.html' + $rootScope.versionParam,
        controller: 'ClientCreationModalController'
      });
      return modalInstance;
    };
    $scope.delete = function() {
      Clients.deleteMultiple($scope.filtered, $scope.selected)
        .then(function(results) {
          $scope.filtered = results;
        }, function() {});
    };
    $scope.hasElementSelected = Helpers.hasElementSelected;
    $scope.go = routingService.go;
    $scope.openLink = Helpers.openLink;
    $scope.permalink = routingService.permalink;
    $scope.selectAll = Helpers.selectAll;
    $scope.silence = Silenced.create;
    $scope.silenceClients = function() {
      Clients.silence($scope.filtered, $scope.selected);
    };
    $scope.user = User;
  }
]);

/**
* Datacenter
*/
controllerModule.controller('DatacenterController', ['Datacenter', '$routeParams', '$scope', 'Sensu', 'titleFactory',
  function (Datacenter, $routeParams, $scope, Sensu, titleFactory) {
    // Fetch the datacenter name
    $scope.name = decodeURI($routeParams.id);
    $scope.pageHeaderText = $scope.name;
    titleFactory.set($scope.pageHeaderText);

    // Get the datacenter
    $scope.datacenter = Datacenter.datacenter;
    Datacenter.realTime($scope.name);
    $scope.$on('$destroy', function() {
      Datacenter.stop();
    });
  }
]);

/**
* Datacenters
*/
controllerModule.controller('DatacentersController', ['routingService', '$scope', 'Sensu', 'titleFactory',
  function (routingService, $scope, Sensu, titleFactory) {
    $scope.pageHeaderText = 'Datacenters';
    titleFactory.set($scope.pageHeaderText);

    // Services
    $scope.go = routingService.go;
  }
]);

/**
* Events
*/
controllerModule.controller('EventsController', ['Clients', 'Events', '$filter', 'Helpers', '$routeParams', 'routingService', '$scope', 'Sensu', 'Silenced', 'titleFactory', 'UserConfig', 'User',
  function (Clients, Events, $filter, Helpers, $routeParams, routingService, $scope, Sensu, Silenced, titleFactory, UserConfig, User) {
    $scope.pageHeaderText = 'Events';
    titleFactory.set($scope.pageHeaderText);

    $scope.filters = {};
    $scope.predicate = ['-check.status', 'occurrences'];
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
      filtered = $filter('regex')(filtered, $scope.filters.q);
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
    $scope.hasElementSelected = Helpers.hasElementSelected;
    $scope.permalink = routingService.permalink;
    $scope.selectAll = Helpers.selectAll;
    $scope.silence = Silenced.create;
    $scope.user = User;
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
    $scope.filters.silenced = UserConfig.get('hideSilencedChecks');
    $scope.$watch('filters.silenced', function () {
      UserConfig.set('hideSilencedChecks', $scope.filters.silenced);
    });

    // Hide events from silenced clients
    $scope.filters.clientsSilenced = UserConfig.get('hideSilencedClients');
    $scope.$watch('filters.clientsSilenced', function () {
      UserConfig.set('hideSilencedClients', $scope.filters.clientsSilenced);
    });

    // Hide occurrences
    $scope.filters.occurrences = UserConfig.get('hideBelowOccurrences');
    $scope.$watch('filters.occurrences', function () {
      UserConfig.set('hideBelowOccurrences', $scope.filters.occurrences);
    });
  }
]);

/**
* Info
*/
controllerModule.controller('InfoController', ['Config', '$scope', 'titleFactory', 'VERSIONS',
  function (Config, $scope, titleFactory, VERSIONS) {
    $scope.pageHeaderText = 'Info';
    titleFactory.set($scope.pageHeaderText);

    $scope.config = Config.get();
    $scope.versions = VERSIONS;
  }
]);

/**
* Login
*/
controllerModule.controller('LoginController', ['Config', '$cookieStore', '$location', 'Login', 'Notification', '$rootScope', '$scope', 'User',
  function (Config, $cookieStore, $location, Login, Notification, $rootScope, $scope, User) {
    $scope.login = {user: '', pass: ''};

    // Get the authentication driver
    Config.resource.get({resource: 'auth'})
      .$promise.then(function(config) {
        $scope.driver = config.driver;

        // Redirect the user to the main page if the authentication is disabled
        // unless the 'status' parameter is set to 'unauthorized', to prevent
        // infinite redirection loop
        if ($scope.driver === '' && $location.search().status !== 'unauthorized') {
          $location.path('/events');
          return;
        }

        // Check if the user is already authenticated
        User.get()
          .$promise.then(function() {
            $location.path('/events').search({status: null});
          });
      },
      function(error) {
        $scope.driver = 'simple';
        console.error(error);
      });

    $scope.submit = function () {
      var login = new Login.resource($scope.login);
      login.$save()
        .then(function() {
          User.set();
          $location.path('/events').search({status: null});
        },
        function(error) {
          console.error(error);
          Notification.error('There was an error with your username/password combination. Please try again');
        });
    };
  }
]);

/**
* Navbar
*/
controllerModule.controller('NavbarController', ['$location', 'Logout', '$scope', 'routingService', 'User',
  function ($location, Logout, $scope, routingService, User) {

    // Services
    $scope.go = routingService.go;
    $scope.user = User;
    $scope.logout = function() {
      Logout.do();
      $location.path('login');
    };
  }
]);

/**
* Settings
*/
controllerModule.controller('SettingsController', ['$cookies', '$scope', 'Sensu', 'THEMES', 'titleFactory',
  function ($cookies, $scope, Sensu, THEMES, titleFactory) {
    $scope.pageHeaderText = 'Settings';
    titleFactory.set($scope.pageHeaderText);

    $scope.$watch('currentTheme', function (theme) {
      $scope.$emit('theme:changed', theme);
    });

    $scope.themes = THEMES;
  }
]);

/**
* Sidebar
*/
controllerModule.controller('SidebarController', ['$location', '$rootScope', '$scope', 'Sensu', 'Sidebar', 'User',
  function ($location, $rootScope, $scope, Sensu, Sidebar, User) {
    // Get CSS class for sidebar elements
    $scope.getClass = function(path) {
      if ($location.path().substr(0, path.length) === path) {
        return 'selected';
      } else {
        return '';
      }
    };

    // Get health
    var health = Sensu.updateHealth();
    $scope.$watch(function () { return Sensu.getHealth(); }, function (result) {
      if (angular.isObject(result)) {
        $scope.health = result;
        $scope.alerts = Sidebar.getAlerts(result);
      }
    });
    $scope.$on('$destroy', function() {
      Sensu.stop(health);
    });

    // Get metrics
    var metrics = Sensu.updateMetrics();
    $scope.$watch(function () { return Sensu.getMetrics(); }, function (result) {
      if (angular.isObject(result)) {
        $scope.metrics = result;
      }
    });
    $scope.$on('$destroy', function() {
      Sensu.stop(metrics);
    });

    $scope.popoversTemplates = {
      alerts: $rootScope.partialsPath + '/popovers/alerts.html' + $rootScope.versionParam,
      aggregates: $rootScope.partialsPath + '/popovers/aggregates.html' + $rootScope.versionParam,
      checks: $rootScope.partialsPath + '/popovers/checks.html' + $rootScope.versionParam,
      clients: $rootScope.partialsPath + '/popovers/clients.html' + $rootScope.versionParam,
      datacenters: $rootScope.partialsPath + '/popovers/datacenters.html' + $rootScope.versionParam,
      events: $rootScope.partialsPath + '/popovers/events.html' + $rootScope.versionParam,
      silenced: $rootScope.partialsPath + '/popovers/silenced.html' + $rootScope.versionParam,
      stashes: $rootScope.partialsPath + '/popovers/stashes.html' + $rootScope.versionParam
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
    $scope.user = User;
  }
]);

/**
* Silenced
*/
controllerModule.controller('SilencedController', ['$filter', 'Helpers', '$routeParams', 'routingService', '$scope', 'Sensu', 'Silenced', 'titleFactory', 'User',
  function ($filter, Helpers, $routeParams, routingService, $scope, Sensu, Silenced, titleFactory, User) {
    $scope.pageHeaderText = 'Silenced';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'id';
    $scope.reverse = false;
    $scope.selectAll = {checked: false};
    $scope.selected = {all: false, ids: {}};

    var updateFilters = function() {
      var filtered = $filter('filter')($scope.silenced, {dc: $scope.filters.dc}, Helpers.equals);
      filtered = $filter('regex')(filtered, $scope.filters.q);
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
    $scope.hasElementSelected = Helpers.hasElementSelected;
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;
    $scope.selectAll = Helpers.selectAll;
    $scope.silence = Silenced.create;
    $scope.user = User;
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
controllerModule.controller('SilencedModalController', ['Config', '$filter', 'items', 'Notification', '$q', '$rootScope', '$scope', 'Sensu', 'Silenced', 'Subscriptions', '$uibModalInstance',
  function (Config, $filter, items, Notification, $q, $rootScope, $scope, Sensu, Silenced, Subscriptions, $uibModalInstance) {
    // Determine if we are creating silenced entries from scratch or we were
    // provided with some items already
    $scope.items = items;
    $scope.silencedItemsCount = $filter('filter')(items, {silenced: true}).length;
    $scope.itemsToSilenceCount = items.length - $scope.silencedItemsCount;
    $scope.itemType = Silenced.itemType(items);

    // If we are creating a silenced entry from nothing, we should have no items
    if ($scope.itemType === 'new') {
      items = [];
    }

    $scope.disableNoExpiration = Config.disableNoExpiration();
    $scope.durations = Config.silenceDurations();
    $scope.entries = [];
    $scope.format = Config.dateFormat();
    $scope.options = {
      ac: {},
      check: '',
      client: '',
      datacenter: '',
      durationFormat: 'hours',
      expire: 'resolve',
      reason: '',
      subscription: '',
      to: moment().add(1, 'h').format($scope.format),
      what: '',
      who: ''
    };

    // Prepare the mad libs form
    if (items.length === 0) {
      // If we only have one datacenter, it should set to it by default
      $scope.$watch('datacenters', function(dc) {
        if(angular.isArray(dc) && dc.length === 1) {
          $scope.options.datacenter = dc[0].name;
        }
      });
    } else if (items.length === 1 && $scope.itemsToSilenceCount === 1) {
      var item = items[0];
      // We have a single element to silence, let's use its datacenter
      var options = Silenced.itemOptions(item, $scope.itemType);
      Object.assign($scope.options, options);
    }

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

    // The modal window has been submitted
    $scope.addEntry = function() {
      // Verify the datacenter
      if (angular.isUndefined($scope.options.datacenter) || $scope.options.datacenter === '') {
        Notification.error('Please select a datacenter');
        return false;
      }

      // Verify the "what"
      if (angular.isUndefined($scope.options.what) || $scope.options.what === '') {
        Notification.error('Please select which element you wish to silence');
        return false;
      } else if ($scope.options.what === 'check' && (angular.isUndefined($scope.options.check) || $scope.options.check === '')) {
        Notification.error('Please enter which check should be silenced');
        return false;
      }

      // Verify the "who"
      if (angular.isUndefined($scope.options.who) || $scope.options.who === '') {
        Notification.error('Please select on which element you wish to silence');
        return false;
      } else if ($scope.options.who === 'client' && (angular.isUndefined($scope.options.client) || $scope.options.client === '')) {
        Notification.error('Please enter which client should be silenced');
        return false;
      } else if ($scope.options.who === 'subscription' && (angular.isUndefined($scope.options.subscription) || $scope.options.subscription === '')) {
        Notification.error('Please enter which subscription should be silenced');
        return false;
      }

      // Verify the duration
      if ($scope.options.expire === 'custom') {
        if (angular.isUndefined($scope.options.to) || $scope.options.to === '') {
          Notification.error('Please enter a date for the custom expiration');
          return false;
        }
      } else if (angular.isDefined($scope.options.expire) && $scope.options.expire === 'duration' && angular.isUndefined($scope.options.duration)) {
        Notification.error('Please enter a proper duration for the expiration');
        return false;
      }

      // Verify the reason
      if (Config.requireSilencingReason() && $scope.options.reason === '') {
        Notification.error('Please provide a reason for silencing');
        return false;
      }

      // Set the proper options
      $scope.options = Silenced.validate($scope.options);

      Silenced.addEntry($scope.options)
      .then(
        function() {
          Notification.success('The silenced entry has been created');
          $uibModalInstance.close();
        },
        function(error) {
          Notification.error('Could not create the silenced entry. ' + error.data);
        }
      );
    };

    $scope.addEntries = function() {
      var promises = [];
      angular.forEach(items, function(item) {
        // Get the options based on the item
        var options = Silenced.itemOptions(item, $scope.itemType);

        // Set common options
        options.duration = $scope.options.duration;
        options.durationFormat = $scope.options.durationFormat;
        options.expire = $scope.options.expire;
        options.reason = $scope.options.reason;
        options.to = $scope.options.to;

        // Validate the options
        options = Silenced.validate(options);

        promises.push(Silenced.addEntry(options));
      });

      $q.all(promises)
        .then(
          function(results) {
            Notification.success(results.length + ' silenced entries have been created');
            $uibModalInstance.close();
          },
          function(error) {
            Notification.error('Could not create the silenced entry. ' + error.data);
          }
        );
    };

    $scope.clearEntries = function() {
      // Silenced entries to clear
      if ($scope.entries.length !== 0) {
        Silenced.clearEntries($scope.entries).then(
          function(results) {
            if (results.length === 0) {
              Notification.error('Please select at least one entry to clear');
              return;
            }
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
    };

    $scope.ok = function() {
      if ($scope.itemsToSilenceCount <= 1 && $scope.silencedItemsCount === 0) {
        $scope.addEntry();
      }
      if ($scope.itemsToSilenceCount >= 2) {
        $scope.addEntries();
      }
      if ($scope.silencedItemsCount >= 1) {
        $scope.clearEntries();
      }
    };

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };

    // Services
    $scope.Config = Config;
  }
]);

/**
* Stash
*/
controllerModule.controller('StashController', [ 'backendService', '$filter', '$routeParams', '$scope', 'Stashes', 'titleFactory',
  function (backendService, $filter, $routeParams, $scope, Stashes, titleFactory) {
    // Routing
    $scope.id = decodeURI($routeParams.id);
    titleFactory.set($scope.id);

    // Get the stash
    $scope.stash = null;
    var stashes = [];
    backendService.getStashes()
      .then(function (response) {
        stashes = response.data;

        var stash = Stashes.get(stashes, $scope.id);
        // Prepare rich output
        angular.forEach(stash.content, function(value, key) { // jshint ignore:line
          value = $filter('getTimestamp')(value);
          value = $filter('richOutput')(value);
          stash.content[key] = value; // jshint ignore:line
        });

        $scope.stash = stash;
      }, function(error) {
        if (error !== null) {
          console.error(JSON.stringify(error));
        }
      });
  }
]);

/**
* Stashes
*/
controllerModule.controller('StashesController', ['$filter', 'Helpers', '$rootScope', '$routeParams', 'routingService', '$scope', 'Sensu', 'Stashes', 'titleFactory', 'User',
  function ($filter, Helpers, $rootScope, $routeParams, routingService, $scope, Sensu, Stashes, titleFactory, User) {
    $scope.pageHeaderText = 'Stashes';
    titleFactory.set($scope.pageHeaderText);

    $scope.predicate = 'client';
    $scope.reverse = false;
    $scope.selectAll = {checked: false};
    $scope.selected = {all: false, ids: {}};

    var updateFilters = function() {
      var filtered = $filter('filter')($scope.stashes, {dc: $scope.filters.dc}, Helpers.equals);
      filtered = $filter('regex')(filtered, $scope.filters.q);
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
    $scope.hasElementSelected = Helpers.hasElementSelected;
    $scope.go = routingService.go;
    $scope.permalink = routingService.permalink;
    $scope.selectAll = Helpers.selectAll;
    $scope.user = User;
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
