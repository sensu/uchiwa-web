'use strict';

var directiveModule = angular.module('uchiwa.directives', []);

// clientSummary generate the client key/value panel on the client view
directiveModule.directive('clientSummary', ['$filter', '$rootScope', function ($filter, $rootScope) {
  return {
    templateUrl: $rootScope.partialsPath + '/directives/client-summary.html',
    link: function (scope, element, attrs) {
      scope.clientSummary = {};

      attrs.$observe('client', function() {
        scope.clientImages = [];
        angular.forEach(scope.client, function(value, key) {
          // Ignore redundant keys
          var unusedKeys = [ 'acknowledged', 'dc', 'events', 'eventsSummary', 'history', 'output', 'status' ];
          if (unusedKeys.indexOf(key) === -1) {
            // Apply filters
            value = $filter('getTimestamp')(value);
            value = $filter('richOutput')(value);

            // Move images to their own panels
            if (/<img src=/.test(value)) {
              scope.clientImages.push({key: key, value: value});
              delete scope.clientSummary[key];
            } else {
              scope.clientSummary[key] = value;
              scope.timestamp = scope.client.timestamp;
            }
          }
        });
      });
    }
  };
}]);

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

directiveModule.directive('uwProgressBar', ['$filter', '$rootScope', function ($filter, $rootScope) {
  return {
    restrict: 'E',
    scope: {
      aggregate: '='
    },
    templateUrl: $rootScope.partialsPath + '/directives/progress-bar.html',
    link: function (scope, element, attrs) {
      attrs.$observe('aggregate', function() {
        scope.critical = $filter('number')(scope.aggregate.critical / scope.aggregate.total * 100, 0);
        scope.success = $filter('number')(scope.aggregate.ok / scope.aggregate.total * 100, 0);
        scope.unknown = $filter('number')(scope.aggregate.unknown / scope.aggregate.total * 100, 0);
        scope.warning = $filter('number')(scope.aggregate.warning / scope.aggregate.total * 100, 0);
      });
    }
  };
}]);

directiveModule.directive('relativeTime', ['$filter', '$rootScope', function ($filter, $rootScope) {
  return {
    restrict: 'E',
    scope: {
      timestamp: '='
    },
    templateUrl: $rootScope.partialsPath + '/directives/relative-time.html'
  };
}]);

directiveModule.directive('silenceIcon', function () {
  return {
    restrict: 'E',
    scope: {
      acknowledged: '='
    },
    template: '<span class="fa-stack">' +
      '<i class="fa fa-fw {{ acknowledged | getAckClass }}"></i>' +
      '<i class="fa fa-ban fa-stack-1x text-danger" ng-if="acknowledged"></i>' +
      '</span>'
  };
});

directiveModule.directive('siteTheme', ['conf', '$cookies', '$rootScope', function (conf, $cookies, $rootScope) {
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

        if (angular.isUndefined(scope.currentTheme)) {
          scope.currentTheme = $rootScope.themes[0];
        }

        var name = scope.currentTheme.name;
        var enterprise = scope.currentTheme.enterprise || false;

        var oneYearExpiration = new Date();
        oneYearExpiration.setYear(oneYearExpiration.getFullYear()+1);
        $cookies.put('uchiwa_theme', name, { 'expires': oneYearExpiration });

        var path = enterprise ? 'css/' : 'bower_components/uchiwa-web/css/';
        element.attr('href', path + name + '/' + name + '.css');
      };
      scope.$on('theme:changed', function (event, theme) {
        setTheme(theme.name);
      });
      var currentTheme = $cookies.get('uchiwa_theme');
      setTheme(currentTheme);
    }
  };
}]);

directiveModule.directive('statusGlyph', ['$filter', function ($filter) {
  return {
    restrict: 'EA',
    link: function(scope, element, attrs) {

      function updateGlyph(style) {
        style = parseInt(style);
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
            element.addClass('fa-times-circle-o');
            break;
          case 3:
            element.addClass('fa-question-circle');
            break;
        }

        var status = $filter('getStatusClass')(style);
        element.addClass('text-' + status);
      }
      attrs.$observe('statusGlyph', function() {
        updateGlyph(attrs.statusGlyph);
      });
    }
  };
}]);
