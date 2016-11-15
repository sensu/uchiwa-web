'use strict';

describe('factories', function () {
  var $rootScope;
  var $scope;
  var mockConfig;

  beforeEach(module('uchiwa'));

  beforeEach(function() {
    mockConfig = jasmine.createSpyObj('mockConfig', ['appName']);
    mockConfig.appName.and.callFake(function() {return 'Uchiwa'});
    module(function($provide) {
      $provide.value('Config', mockConfig);
    });
  });

  beforeEach(inject(function (_$rootScope_) {
    $rootScope = _$rootScope_;
    $scope = $rootScope.$new();
  }));

  describe('titleFactory', function () {
    it('should have a get method', inject(function (titleFactory) {
      expect(titleFactory.get).toBeDefined();
    }));

    it('should have a set method', inject(function (titleFactory) {
      expect(titleFactory.set).toBeDefined();
    }));

    describe('title()', function () {
      it('should suffix the application title', inject(function (titleFactory) {
        var title = 'Test';
        titleFactory.set(title);
        expect(titleFactory.get()).toBe(title + ' | Uchiwa');
      }));
    });

  });

});
