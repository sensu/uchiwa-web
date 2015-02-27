'use strict';

var directiveModule = angular.module('uchiwa.directives', []);

directiveModule.directive('panelActions', ['$rootScope', function ($rootScope) {
  return {
    restrict: 'E',
    scope: {
      data: '=',
      resolveFn: '=',
      resolveLegend: '@',
      silenceFn: '='
    },
    templateUrl: $rootScope.partialsPath + '/panel/actions.html'
  };
}]);

directiveModule.directive('panelLimit', ['$rootScope', function ($rootScope) {
  return {
    restrict: 'E',
    scope: {
      data: '=',
      filters: '=',
      permalink: '='
    },
    templateUrl: $rootScope.partialsPath + '/panel/limit.html'
  };
}]);

directiveModule.directive('siteTheme', ['conf', '$cookieStore', '$rootScope', function (conf, $cookieStore, $rootScope) {
  return {
    restrict: 'EA',
    link: function (scope, element) {
      var lookupTheme = function (themeName) {
        return $rootScope.themes[$rootScope.themes.map(function (t) {
          return t.name;
        }).indexOf(themeName)];
      };
      var setTheme = function (theme) {
        var themeName = angular.isDefined(theme) ? theme : conf.theme;
        scope.currentTheme = lookupTheme(themeName);
        var name = scope.currentTheme.name;
        var enterprise = scope.currentTheme.enterprise || false;

        $cookieStore.put('uchiwa_theme', name);

        var path = enterprise ? 'css/' : 'bower_components/uchiwa-web/css/';
        element.attr('href', path + name + '/' + name + '.css');
      };
      scope.$on('theme:changed', function (event, theme) {
        setTheme(theme.name);
      });
      var currentTheme = $cookieStore.get('uchiwa_theme');
      setTheme(currentTheme);
    }
  };
}]);

directiveModule.directive('statusGlyph', ['$filter', function ($filter) {
  return {
    restrict: 'EA',
    link: function(scope, element, attrs) {

      function updateGlyph(style) {
        element.removeAttr('class');
        element.addClass('fa fa-fw');
        switch(style) {
          case 0:
            element.addClass('fa-check-circle');
            break;
          case 1:
            element.addClass('fa-exclamation-circle');
            break;
          case 2:
            element.addClass('fa-bomb');
            break;
          case 3:
            element.addClass('fa-question-circle');
            break;
        }

        var status = $filter('getStatusClass')(style);
        element.addClass('text-' + status);
      }

      scope.$watch(attrs.statusGlyph, function(value) {
        updateGlyph(value);
      });
    }
  };
}]);
