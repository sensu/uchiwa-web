'use strict';

var directiveModule = angular.module('uchiwa.directives', []);


directiveModule.directive('aggregateResult', ['$rootScope', function ($rootScope) {
  return {
    restrict: 'E',
    scope: {
      aggregate: '=',
      dc: '=',
      go: '=',
      name: '=',
      severity: '@'
    },
    templateUrl: $rootScope.partialsPath + '/directives/aggregate-result.html' + $rootScope.versionParam
  };
}]);

// clientKeepalivesBanner displays a warning banner if a client has
// keepalives !== false, which means it could be overwritten by the client
directiveModule.directive('clientKeepalivesBanner', ['$rootScope',
function ($rootScope) {
  return {
    restrict: 'E',
    scope: {
      keepalives: '='
    },
    templateUrl: $rootScope.partialsPath +
      '/directives/client-keepalives-banner.html' +
      $rootScope.versionParam,
    link: function (scope) {
      scope.display = false;

      var verifyKeepalives = function() {
        if (angular.isUndefined(scope.keepalives) || scope.keepalives !== false) {
          scope.display = true;
          return;
        }
        scope.display = false;
      };

      // Check the initial value
      verifyKeepalives();

      // Watch for further changes
      scope.$watch('keepalives', function() {
        verifyKeepalives();
      });
    }
  };
}]);

// clientSubscriptionsBanner displays a warning banner if a user does not
// have access to that client based on the subscriptions via RBAC
directiveModule.directive('clientSubscriptionsBanner', ['$q', '$rootScope', 'Subscriptions', 'User',
function ($q, $rootScope, Subscriptions, User) {
  return {
    restrict: 'E',
    scope: {
      subscriptions: '='
    },
    templateUrl: $rootScope.partialsPath +
      '/directives/client-subscriptions-banner.html' +
      $rootScope.versionParam,
    link: function (scope) {
      scope.display = false;
      scope.userSubscriptions = [];

      var verifySubscriptions = function() {
        if (angular.isDefined(scope.subscriptions) && angular.isArray(scope.subscriptions) && scope.subscriptions.length > 0) {
          var promises = [];
          angular.forEach(scope.subscriptions, function(subscription) {
            var deferred = $q.defer();
            Subscriptions.get(subscription)
              .$promise.then(function() {
                deferred.reject();
              }, function() {
                deferred.resolve();
              });
            promises.push(deferred.promise);

          });
          $q.all(promises).then(function() {
            scope.display = true;
          }, function() {
            scope.display = false;
          });
        }
        scope.display = false;
      };

      // Check the initial value
      verifySubscriptions();

      // Watch for further changes
      scope.$watch('subscriptions', function() {
        verifySubscriptions();
      });

      // Get the user subscriptions
      scope.userSubscriptions = User.subscriptions();
    }
  };
}]);

// clientSummary generate the client key/value panel on the client view
directiveModule.directive('clientSummary', ['$filter', '$rootScope', function ($filter, $rootScope) {
  return {
    templateUrl: $rootScope.partialsPath + '/directives/client-summary.html' + $rootScope.versionParam,
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

directiveModule.directive('logoUrl', ['Config', function (Config) {
  return {
    link: function(scope, element) {
      if (Config.logoURL() === '') {
        element.addClass('theme-logo');
      } else {
        var img = '<img src="'+ Config.logoURL() +'">';
        element.append(img);
      }
    }
  };
}]);

directiveModule.directive('panelActions', ['$rootScope',
function ($rootScope) {
  return {
    restrict: 'E',
    scope: {
      data: '=',
      refreshFn: '=',
      refreshLegend: '@',
      resolveFn: '=',
      resolveLegend: '@',
      silenceFn: '='
    },
    templateUrl: $rootScope.partialsPath + '/panels/actions.html' + $rootScope.versionParam
  };
}]);

directiveModule.directive('panelLimit', ['$rootScope',
function ($rootScope) {
  return {
    restrict: 'E',
    scope: {
      data: '=',
      filters: '=',
      permalink: '='
    },
    templateUrl: $rootScope.partialsPath + '/panels/limit.html' + $rootScope.versionParam
  };
}]);

directiveModule.directive('relativeTime', ['$filter', '$rootScope',
function ($filter, $rootScope) {
  return {
    restrict: 'E',
    scope: {
      timestamp: '='
    },
    link: function(scope) {
      if (angular.isDefined(scope.timestamp) && !angular.isNumber(scope.timestamp)) {
        scope.timestamp = Date.parse(scope.timestamp)/1000;
      }
    },
    templateUrl: $rootScope.partialsPath + '/directives/relative-time.html' + $rootScope.versionParam
  };
}]);

directiveModule.directive('sidebarPopover', ['$rootScope',
function ($rootScope) {
  return {
    restrict: 'E',
    scope: {
      hasCriticity: '=',
      metrics: '=',
      name: '@',
      pluralized: '@'
    },
    templateUrl: $rootScope.partialsPath + '/directives/sidebar-popover.html' + $rootScope.versionParam
  };
}]);

directiveModule.directive('silenceIcon', function () {
  return {
    restrict: 'E',
    scope: {
      silenced: '='
    },
    template: '<span class="fa-stack">' +
      '<i class="fa {{ silenced | getAckClass }}"></i>' +
      '<i class="fa fa-ban fa-stack-1x text-danger" ng-if="silenced"></i>' +
      '</span>'
  };
});

directiveModule.directive('siteTheme', ['Config', '$cookies', 'THEMES',
function (Config, $cookies, THEMES) {
  return {
    restrict: 'EA',
    link: function (scope, element) {
      var lookupTheme = function (themeName) {
        return THEMES[THEMES.map(function (t) {
          return t.name;
        }).indexOf(themeName)];
      };
      var setTheme = function (theme) {
        var themeName = angular.isDefined(theme) ? theme : Config.defaultTheme();
        scope.currentTheme = lookupTheme(themeName);

        if (angular.isUndefined(scope.currentTheme)) {
          scope.currentTheme = THEMES[0];
        }

        var name = scope.currentTheme.name;
        var enterprise = scope.currentTheme.enterprise || false;

        var oneYearExpiration = new Date();
        oneYearExpiration.setYear(oneYearExpiration.getFullYear()+1);
        $cookies.put('theme', name, { 'expires': oneYearExpiration });

        var path = enterprise ? 'css/' : 'bower_components/uchiwa-web/css/';
        element.attr('href', path + name + '/' + name + '.css');
      };
      scope.$on('theme:changed', function (event, theme) {
        setTheme(theme.name);
      });
      var currentTheme = $cookies.get('theme');
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
