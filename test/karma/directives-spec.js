'use strict';

describe('directives', function () {
  var $compile;
  var $rootScope;
  var element;
  var scope;

  beforeEach(module('uchiwa'));
  beforeEach(module('partials'));
  beforeEach(inject(function (_$compile_, _$rootScope_, $httpBackend) {
    $compile = _$compile_;
    $httpBackend.whenGET('config').respond([]);
    $rootScope = _$rootScope_;
    $rootScope.partialsPath = 'partials';
    element = jasmine.createSpyObj('element', ['tooltip', 'attr', 'removeAttr', 'addClass']);
    scope = jasmine.createSpyObj('scope', ['$on', '$watch']);
  }));

  describe('clientSummary', function() {
    it('ignores redundant keys in the client data and handles images', function(){
      scope = $rootScope.$new();
      element = $compile('<client-summary client="{{client}}"></client-summary>')(scope);
      scope.client = {dc: 'foo', image: 'https://uchiwa.io/dashboard.jpg', version: '0.20.4'};
      scope.$digest();

      expect(scope.clientSummary).toEqual({version: '0.20.4'});
      expect(scope.clientImages[0].value).toBe('<a target="_blank" href="https://uchiwa.io/dashboard.jpg"><img src="https://uchiwa.io/dashboard.jpg"></a>');
      expect(element.find('img').eq(0).attr('src')).toBe('https://uchiwa.io/dashboard.jpg')
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
      expect($rootScope.themes.length).toBeGreaterThan(0);
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
