'use strict';

var injector = angular.injector(['ng']);
var $http = injector.get('$http');

$http.get('config/users').then(
  function(response) {
    angular.module('uchiwa').constant('DefaultConfig', response.data);
    angular.element(document).ready(function() {
      angular.bootstrap(document, ['uchiwa']);
    });
  },
  function() {
    var bodyElement = angular.element(document.body);
    bodyElement.addClass('bootstrap-error');
    console.error('Could not retrieve backend configuration.');
  }
);
