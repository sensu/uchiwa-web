'use strict';

describe('directives', function () {
  var $compile;
  var $rootScope;
  var element;
  var scope;
  var mockConfig;
  var $httpBackend;
  var mockSubscriptions;
  var $q;
  var deferred;

  beforeEach(module('uchiwa'));
  beforeEach(module('partials'));

  beforeEach(function() {
    mockSubscriptions = {};
    mockConfig = jasmine.createSpyObj('mockConfig', ['dateFormat', 'defaultTheme', 'logoURL']);
    mockConfig.dateFormat.and.callFake(function() {return 'YYYY-MM-DD HH:mm:ss'});
    mockConfig.defaultTheme.and.callFake(function() {return 'uchiwa-default'});
    mockConfig.logoURL.and.callFake(function() {return 'http://127.0.0.1/foo.png'});

    module(function($provide) {
      $provide.value('Config', mockConfig);
      $provide.value('Subscriptions', mockSubscriptions);
    });

    inject(function (_$compile_, _$rootScope_, _$httpBackend_, _$q_) {
      $compile = _$compile_;
      $httpBackend = _$httpBackend_;
      $httpBackend.whenGET('config').respond([]);
      $rootScope = _$rootScope_;
      $rootScope.partialsPath = 'partials';
      $rootScope.versionParam = '';
      element = jasmine.createSpyObj('element', ['tooltip', 'attr', 'removeAttr', 'addClass']);
      scope = jasmine.createSpyObj('scope', ['$on', '$watch']);
      $q = _$q_;
      deferred = _$q_.defer();
    });

    mockSubscriptions.get = function() {
      // mock promise
      // var deferred = $q.defer();
      // deferred.reject();
      // return deferred.promise;
      //deferred = $q.defer();
      //deferred.resolve();
      return {$promise: deferred.promise};
    }
  });

  describe('clientKeepalivesBanner', function() {
    it('displays a banner if keepalives is not equal to false', function(){
      scope = $rootScope.$new();
      element = $compile('<client-keepalives-banner keepalives="client.keepalives"></client-keepalives-banner>')(scope);
      scope.client = {keepalives: true};
      $compile(element)(scope);
      scope.$digest();

      expect(element.isolateScope().display).toEqual(true);
    });

    it('displays nothing if keepalives is equal to false', function(){
      scope = $rootScope.$new();
      element = $compile('<client-keepalives-banner keepalives="client.keepalives"></client-keepalives-banner>')(scope);
      scope.client = {keepalives: false};
      $compile(element)(scope);
      scope.$digest();

      expect(element.isolateScope().display).toEqual(false);
    });
  });

  describe('clientSubscriptionsBanner', function() {
    it('displays nothing if the subscriptons are empty', function(){
      scope = $rootScope.$new();
      element = $compile('<client-subscriptions-banner subscriptions="client.subscriptions"></client-subscriptions-banner>')(scope);
      scope.client = {subscriptions: []};
      $compile(element)(scope);
      scope.$digest();

      expect(element.isolateScope().display).toEqual(false);
    });

    it('displays nothing if one of the subscription returns 200', function(){
      deferred.resolve();

      scope = $rootScope.$new();
      element = $compile('<client-subscriptions-banner subscriptions="client.subscriptions"></client-subscriptions-banner>')(scope);
      scope.client = {subscriptions: ['foo']};
      $compile(element)(scope);
      scope.$digest();

      expect(element.isolateScope().display).toEqual(false);
    });

    it('displays the banner if none of the subscriptions return 200', function(){
      deferred.reject();

      scope = $rootScope.$new();
      element = $compile('<client-subscriptions-banner subscriptions="client.subscriptions"></client-subscriptions-banner>')(scope);
      scope.client = {subscriptions: ['foo']};
      $compile(element)(scope);
      scope.$digest();

      expect(element.isolateScope().display).toEqual(true);
    });
  });

  describe('clientSummary', function() {
    it('ignores redundant keys in the client data and handles images', function(){
      scope = $rootScope.$new();
      element = $compile('<client-summary client="{{client}}"></client-summary>')(scope);
      scope.client = {dc: 'foo', image: 'https://uchiwa.io/dashboard.jpg', version: '0.20.4'};
      scope.$digest();

      expect(scope.clientSummary).toEqual({version: '0.20.4'});
      expect(scope.clientImages[0].value).toBe('<a href="https://uchiwa.io/dashboard.jpg"><img src="https://uchiwa.io/dashboard.jpg"></a>');
      expect(element.find('img').eq(0).attr('src')).toBe('https://uchiwa.io/dashboard.jpg');
    });
  });

  describe('logoUrl', function() {
    it('returns the default logo', function(){
      scope = $rootScope.$new();
      element = $compile('<logo-url></logo-url>')(scope);
      scope.$digest();

      expect(element.find('img').eq(0).attr('src')).toBe('http://127.0.0.1/foo.png');
    });
  });

  describe('siteTheme', function () {
    it('should be restricted to elements and attributes', inject(function (siteThemeDirective) {
      expect(siteThemeDirective[0].restrict).toBe('EA');
    }));

    it('should have a link method', inject(function (siteThemeDirective) {
      expect(siteThemeDirective[0].link).toBeDefined();
    }));

    it('should define themes', inject(function (siteThemeDirective) {
      siteThemeDirective[0].link(scope, element);
      expect(scope.currentTheme).toBeDefined();
    }));

    it('should listen for theme:changed event', inject(function (siteThemeDirective) {
      siteThemeDirective[0].link(scope, element);
      expect(scope.$on).toHaveBeenCalledWith('theme:changed', jasmine.any(Function));
    }));
  });

  describe('statusGlyph', function () {
    it('should be restricted to elements and attributes', inject(function (statusGlyphDirective) {
      expect(statusGlyphDirective[0].restrict).toBe('EA');
    }));

    it('should have a link method', inject(function (statusGlyphDirective) {
      expect(statusGlyphDirective[0].link).toBeDefined();
    }));
  });
});
