'use strict';

describe('Controller', function () {
  var $rootScope;
  var $scope;
  var routeParams;
  var createController;
  var mockConfig;
  var mockNotification;
  var mockRoutingService;
//  var mockSilencedService;
  var uibModalInstance = { close: function() {}, dismiss: function() {} };
  var items = [];

  beforeEach(module('uchiwa'));

  beforeEach(function () {
    mockConfig = jasmine.createSpyObj('Config', [
      'appName',
      'dateFormat',
      'disableNoExpiration',
      'refresh',
      'requireSilencingReason',
      'silenceDurations'
    ]);
    mockNotification = jasmine.createSpyObj('mockNotification', [
      'error',
      'success'
    ]);
    mockRoutingService = jasmine.createSpyObj('mockRoutingService', [
      'search',
      'go',
      'initFilters',
      'permalink',
      'updateFilters'
    ]);

    module(function ($provide) {
      $provide.value('Config', mockConfig);
      $provide.value('Notification', mockNotification);
      $provide.value('routingService', mockRoutingService);
    });
  });

  beforeEach(inject(function ($controller, $httpBackend, _$rootScope_) {
    $rootScope = _$rootScope_;
    $scope = $rootScope.$new();
    routeParams = {};

    createController = function (controllerName, properties) {
      return $controller(controllerName, angular.extend({
        $scope: $scope,
        $uibModalInstance: uibModalInstance,
        items: items,
        $routeParams : routeParams
      }, properties));
    };
    $httpBackend.whenGET('health').respond([]);
    $httpBackend.whenGET('metrics').respond([]);
    $httpBackend.whenGET('silenced').respond([]);
    $httpBackend.whenGET('subscriptions').respond([]);
    $httpBackend.whenGET(/events\.html.*/).respond(200, '');
  }));

  describe('ChecksController', function () {
    var controllerName = 'ChecksController';

    beforeEach(function () {
      spyOn($scope, '$on').and.callThrough();
      createController(controllerName);
    });

    it('should have a subscribersSummary method', function () {
      expect($scope.subscribersSummary).toBeDefined();
    });

    it('should listen for the $locationChangeSuccess event', function () {
      expect($scope.$on).toHaveBeenCalledWith('$locationChangeSuccess', jasmine.any(Function));
    });
    it('should handle the $locationChangeSuccess event', function () {
      expect($scope.filters).toBeDefined();
      expect(mockRoutingService.initFilters).toHaveBeenCalled();
      $scope.$emit('$locationChangeSuccess', {});
      expect(mockRoutingService.updateFilters).toHaveBeenCalled();
    });

    describe('subscribersSummary()', function () {

      it('should join strings', function () {
        var mockArray = ['test', 'a', 'b', 'c'];
        var mockString = 'test a b c';
        expect($scope.subscribersSummary(mockArray)).toBe(mockString);
      });
    });
  });

  describe('ClientController', function () {
    var controllerName = 'ClientController';

    it('should have a deleteClient method', function () {
      createController(controllerName);
      expect($scope.delete).toBeDefined();
    });
    it('should have a resolveEvent method', function () {
      createController(controllerName);
      expect($scope.resolveEvent).toBeDefined();
    });
    it('should have a permalink method', function () {
      createController(controllerName);
      expect($scope.permalink).toBeDefined();
    });
    it('should have a silence method', function () {
      createController(controllerName);
      expect($scope.silence).toBeDefined();
    });
  });

  describe('ClientsController', function () {
    var controllerName = 'ClientsController';

    it('should have a go method', function () {
      createController(controllerName);
      expect($scope.go).toBeDefined();
    });
    it('should have a silence method', function () {
      createController(controllerName);
      expect($scope.silence).toBeDefined();
    });

    describe('permalink method', function () {
      it('exists', function () {
        createController(controllerName);
        expect($scope.permalink).toBeDefined();
      });

      it('should call routing service permalink method', function () {
        createController(controllerName);
        $scope.permalink();
        expect(mockRoutingService.permalink).toHaveBeenCalled();
      });
    });
  });

  describe('EventsController', function () {
    var controllerName = 'EventsController';

    describe('methods', function () {
      beforeEach(function () {
        createController(controllerName);
      });
      it('should have a go method', function () {
        expect($scope.go).toBeDefined();
      });
      it('should have a silence method', function () {
        expect($scope.silence).toBeDefined();
      });
    });
  });

  describe('InfoController', function () {
    var controllerName = 'info';
    // TODO
  });

  describe('LoginController', function () {
    var controllerName = 'LoginController';
    // TODO
  });

  describe('NavbarController', function () {
    var controllerName = 'NavbarController';
    // TODO
  });

  describe('SettingsController', function () {
    var controllerName = 'SettingsController';

    it("should emit a theme:changed event when the current theme changes", function () {
      createController(controllerName);
      var expectedTheme = 'foo theme';
      var expectedEvent = 'theme:changed';
      spyOn($scope, '$emit');

      $scope.currentTheme = expectedTheme;

      $scope.$apply();
      expect($scope.$emit).toHaveBeenCalledWith(expectedEvent, expectedTheme);
    });
  });

  describe('SidebarController', function () {
    beforeEach(function () {
      $rootScope.metrics = {aggregates: {total: 0}, checks: {total: 0}, clients: {critical: 0, total: 0, unknown: 0, warning: 0}, datacenters: {total: 0}, events: {critical: 0, total: 0, unknown: 0, warning: 0}, silenced: {total: 0}, stashes: {total: 0}};
    });

    var controllerName = 'SidebarController';

    it('should have a getClass method', function () {
      createController(controllerName);
      expect($scope.getClass).toBeDefined();
    });

    describe('getClass()', function () {
      it('should return selected if path matches location', function () {
        createController(controllerName, {
          '$location': {
            path: function () {
              return 'events#some-anchor';
            }
          }
        });
        expect($scope.getClass('events')).toBe('selected');
        expect($scope.getClass('clients')).toBe('');
      });
    });
  });

  describe('SilencedModalController', function () {
    var controllerName = 'SilencedModalController';

    describe('madlibs form', function() {
      describe('datacenter select', function() {
        it('does not throw any error if we have no datacenters', function () {
          createController(controllerName);
          $scope.datacenters = undefined;
          $scope.$digest();
          expect($scope.options.datacenter).toEqual('');
        });

        it('sets a default datacenter if we only have a single datacenter', function () {
          createController(controllerName);
          $scope.datacenters = [{'name': 'foo'}];
          $scope.$digest();
          expect($scope.options.datacenter).toEqual('foo');
        });

        it('does not set a default datacenter if we have multiple datacenters', function () {
          createController(controllerName);
          $scope.datacenters = [{'name': 'foo'}, {'name': 'bar'}];
          $scope.$digest();
          expect($scope.options.datacenter).toEqual('');
        });

        it('sets a default datacenter if we have a single element to silence', function () {
          createController(controllerName, {'items': [{'check': 'bar', 'dc': 'foo', 'silenced': false}]});
          expect($scope.options.datacenter).toEqual('foo');
        });

        it('sets a default check if an event was provided', function () {
          createController(controllerName, {'items': [{'action': 'foo', 'check': 'bar', 'dc': 'foo', 'silenced': false}]});
          expect($scope.options.what).toEqual('check');
          expect($scope.options.check).toEqual('bar');
        });

        it('sets a default client if an event was provided', function () {
          createController(controllerName, {'items': [{'action': 'foo', 'check': 'bar', 'client': {'name': 'foobar'}, 'dc': 'foo', 'silenced': false}]});
          expect($scope.options.who).toEqual('client');
          expect($scope.options.client).toEqual('foobar');
        });

        it('sets the "who" to all checks if a client was provided', function () {
          createController(controllerName, {'items': [{'name': 'foobar', 'dc': 'foo', 'silenced': false, 'version': 1}]});
          expect($scope.options.what).toEqual('checks');
        });

        it('sets the "who" to all checks if a check was provided', function () {
          createController(controllerName, {'items': [{'name': 'foobar', 'dc': 'foo', 'silenced': false}]});
          expect($scope.options.who).toEqual('clients');
        });
      });
    });

    describe('form validation', function() {
      it('fails if no datacenter is selected', function () {
        createController(controllerName);
        $scope.ok();
        expect(mockNotification.error).toHaveBeenCalledWith('Please select a datacenter');
      });

      it('fails if no "what" is selected', function () {
        createController(controllerName);
        $scope.options = {'datacenter': 'foo'};
        $scope.ok();
        expect(mockNotification.error).toHaveBeenCalledWith('Please select which element you wish to silence');
      });

      it('fails if a check is selected without any name', function () {
        createController(controllerName);
        $scope.options = {'datacenter': 'foo', 'what': 'check'};
        $scope.ok();
        expect(mockNotification.error).toHaveBeenCalledWith('Please enter which check should be silenced');
      });

      it('fails if no who" is selected', function () {
        createController(controllerName);
        $scope.options = {'datacenter': 'foo', 'what': 'foo'};
        $scope.ok();
        expect(mockNotification.error).toHaveBeenCalledWith('Please select on which element you wish to silence');
      });

      it('fails if a client is selected without any name', function () {
        createController(controllerName);
        $scope.options = {'datacenter': 'foo', 'what': 'foo', 'who': 'client'};
        $scope.ok();
        expect(mockNotification.error).toHaveBeenCalledWith('Please enter which client should be silenced');
      });

      it('fails if a subscription is selected without any name', function () {
        createController(controllerName);
        $scope.options = {'datacenter': 'foo', 'what': 'foo', 'who': 'subscription'};
        $scope.ok();
        expect(mockNotification.error).toHaveBeenCalledWith('Please enter which subscription should be silenced');
      });

      it('fails if a custom duration is selected without any date', function () {
        createController(controllerName);
        $scope.options = {'datacenter': 'foo', 'what': 'foo', 'who': 'bar', 'expire': 'custom'};
        $scope.ok();
        expect(mockNotification.error).toHaveBeenCalledWith('Please enter a date for the custom expiration');
      });

      it('fails if the duration expiration is selected without any preset', function () {
        createController(controllerName);
        $scope.options = {'datacenter': 'foo', 'what': 'foo', 'who': 'bar', 'expire': 'duration'};
        $scope.ok();
        expect(mockNotification.error).toHaveBeenCalledWith('Please enter a proper duration for the expiration');
      });
    });

    describe('data validation', function() {
      it('deletes the check attribute if all checks must be silenced', function () {
        createController(controllerName);
        $scope.options = {'datacenter': 'foo', 'check': 'foo', 'what': 'checks', 'who': 'bar'};
        $scope.ok();
        expect($scope.options.check).toEqual(undefined);
      });

      it('deletes the subscription attribute if all clients must be silenced', function () {
        createController(controllerName);
        $scope.options = {'datacenter': 'foo', 'subscription': 'foo', 'what': 'foo', 'who': 'clients'};
        $scope.ok();
        expect($scope.options.subscription).toEqual(undefined);
      });

      it('adds the client subscription attribute if a single client must be silenced', function () {
        createController(controllerName);
        $scope.options = {'datacenter': 'foo', 'client': 'foo', 'what': 'foo', 'who': 'client'};
        $scope.ok();
        expect($scope.options.subscription).toEqual('client:foo');
      });

      it('calculates the duration in seconds if a custom expiration was chosen', function () {
        createController(controllerName);
        $scope.options = {'datacenter': 'foo', 'expire': 'custom', 'to': moment().add(1, 'h').format($scope.format), 'what': 'foo', 'who': 'foo'};
        $scope.ok();
        expect($scope.options.expire).toBeLessThan(3601);
        expect($scope.options.expire).toBeGreaterThan(3500);
      });

      it('removes the expire parameter if no expiration was chosen', function () {
        createController(controllerName);
        $scope.options = {'datacenter': 'foo', 'expire': '-1', 'what': 'foo', 'who': 'foo'};
        $scope.ok();
        expect($scope.options.expire).toEqual(undefined);
      });
    });

    describe('addEntries', function() {
      var Silenced;
      beforeEach(inject(function (_Silenced_) {
        Silenced = _Silenced_;
      }));
      it('adds multiple silenced items in bulk', function () {
        createController(controllerName, {
          items: [
            {action: 'create', dc: 'us-east-1', check: {name: 'foo'}, client: {name: 'bar'}},
            {action: 'create', dc: 'us-east-1', check: {name: 'baz'}, client: {name: 'qux'}}
          ]
        });
        spyOn(Silenced, 'addEntry').and.callThrough();

        $scope.options = {expire: '900', reason: 'foobar'};
        $scope.ok();
        expect(Silenced.addEntry).toHaveBeenCalled();
      });
    });
  });

  describe('StashesController', function () {
    var controllerName = 'StashesController';

    it('should listen for the $locationChangeSuccess event', function () {
      spyOn($scope, '$on').and.callThrough();
      createController(controllerName);
      expect($scope.$on).toHaveBeenCalledWith('$locationChangeSuccess', jasmine.any(Function));
    });
    it('should handle the $locationChangeSuccess event', function () {
      createController(controllerName);
      $scope.$emit('$locationChangeSuccess', {});
      expect(mockRoutingService.updateFilters).toHaveBeenCalled();
    });
  });
});
