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
    $httpBackend.whenGET('config').respond([]);
    $httpBackend.whenGET('health').respond([]);
    $httpBackend.whenGET('metrics').respond([]);
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

  describe('ClientsController', function () {
    var controllerName = 'ClientsController';

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

  describe('EventsController', function () {
    var controllerName = 'EventsController';

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
      $rootScope.metrics = {aggregates: {total: 0}, checks: {total: 0}, clients: {critical: 0, total: 0, unknown: 0, warning: 0}, datacenters: {total: 0}, events: {critical: 0, total: 0, unknown: 0, warning: 0}, stashes: {total: 0}};
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
