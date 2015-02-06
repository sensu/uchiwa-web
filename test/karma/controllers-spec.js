'use strict';

describe('Controller', function () {
  var $rootScope;
  var $scope;
  var createController;
  var mockNotification;
  var mockStashesService;
  var mockRoutingService;
  var mockSensuData;
  var mockVersion;

  beforeEach(module('uchiwa'));

  beforeEach(function () {
    mockNotification = jasmine.createSpy('mockNotification');
    mockStashesService = jasmine.createSpyObj('mockStashesService', ['stash', 'deleteStash']);
    mockRoutingService = jasmine.createSpyObj('mockRoutingService', ['search', 'go', 'initFilters', 'permalink', 'updateFilters']);

    mockSensuData = {
      Dc: 'abcd',
      Clients: 'efgh',
      Subscriptions: 'hijk',
      Events: 'lmno'
    };

    mockVersion = {
      uchiwa: 'x.y.z'
    };
    module(function ($provide) {
      $provide.value('notification', mockNotification);
      $provide.value('stashesService', mockStashesService);
      $provide.value('routingService', mockRoutingService);
    });
  });

  beforeEach(inject(function ($controller, $httpBackend, _$rootScope_) {
    $rootScope = _$rootScope_;
    $scope = $rootScope.$new();
    createController = function (controllerName, properties) {
      return $controller(controllerName, _.extend({
        '$scope': $scope
      }, properties));
    };
    $httpBackend.whenGET('get_config').respond([]);
  }));

  describe('checks', function () {
    var controllerName = 'checks';

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

  describe('client', function () {
    var controllerName = 'client';

    it('should have a deleteClient method', function () {
      createController(controllerName);
      expect($scope.deleteClient).toBeDefined();
    });
    it('should have a resolveEvent method', function () {
      createController(controllerName);
      expect($scope.resolveEvent).toBeDefined();
    });
    it('should have a permalink method', function () {
      createController(controllerName);
      expect($scope.permalink).toBeDefined();
    });
    it('should have a stash method', function () {
      createController(controllerName);
      expect($scope.stash).toBeDefined();
    });
  });

  describe('clients', function () {
    var controllerName = 'clients';

    it('should have a go method', function () {
      createController(controllerName);
      expect($scope.go).toBeDefined();
    });
    it('should have a stash method', function () {
      createController(controllerName);
      expect($scope.stash).toBeDefined();
    });
    it('should have a permalink method', function () {
      createController(controllerName);
      expect($scope.permalink).toBeDefined();
    });

    describe('permalink()', function () {

      it('should call routing service permalink method', function () {
        createController(controllerName);
        $scope.permalink();
        expect(mockRoutingService.permalink).toHaveBeenCalled();
      });

    })
  });

  describe('events', function () {
    var controllerName = 'events';

    describe('methods', function () {

      beforeEach(function () {
        createController(controllerName);
      });
      it('should have a go method', function () {
        expect($scope.go).toBeDefined();
      });
      it('should have a stash method', function () {
        expect($scope.stash).toBeDefined();
      });

    });
  });

  describe('info', function () {
    var controllerName = 'info';
  });

  describe('navbar', function () {
    var controllerName = 'navbar';

    it('should count events and client status on sensu', function () {
      createController(controllerName);
      var clients = [
        {
          status: 2
        },
        {
          status: 2
        },
        {
          status: 1
        },
        {
          status: 1
        },
        {
          status: 3
        }
      ];
      var expectedCriticalClients = 2;
      var expectedWarningClients = 2;
      var expectedUnknownClients = 1;
      var expectedClientsStyle = 'critical';

      var events = [
        {
          check: {
            status: 2
          }
        },
        {
          check: {
            status: 2
          }
        },
        {
          check: {
            status: 1
          }
        },
        {
          check: {
            status: 1
          }
        },
        {
          check: {
            status: 3
          }
        }
      ];
      var expectedCriticalEvents = 2;
      var expectedWarningEvents = 2;
      var expectedUnknownEvents = 1;
      var expectedEventsStyle = 'critical';

      //var payload = {Events: expectedEvents, Clients: expectedClients};
      $rootScope.events = events;
      $rootScope.clients = clients;
      $rootScope.$broadcast('sensu');

      expect($rootScope.navbar.clients.critical).toEqual(expectedCriticalClients);
      expect($rootScope.navbar.clients.warning).toEqual(expectedWarningClients);
      expect($rootScope.navbar.clients.unknown).toEqual(expectedUnknownClients);
      expect($rootScope.navbar.events.critical).toEqual(expectedCriticalEvents);
      expect($rootScope.navbar.events.warning).toEqual(expectedWarningEvents);
      expect($rootScope.navbar.events.unknown).toEqual(expectedUnknownEvents);
      expect($rootScope.navbar.clients.style).toEqual(expectedClientsStyle);
      expect($rootScope.navbar.events.style).toEqual(expectedEventsStyle);
    });
  });

  describe('sidebar', function () {
    var controllerName = 'sidebar';

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

  describe('stashes', function () {
    var controllerName = 'stashes';

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

  describe('settings', function () {
    var controllerName = 'settings';

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
});
