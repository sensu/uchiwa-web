'use strict';

var factoryModule = angular.module('uchiwa.factories', []);

/**
* Page title
*/
factoryModule.factory('titleFactory', function() {
  var title = 'Uchiwa';
  return {
    get: function() { return title + ' | Uchiwa'; },
    set: function(newTitle) { title = newTitle; }
  };
});

/**
* Underscore.js
*/
factoryModule.factory('underscore', function () {
  if (angular.isUndefined(window._)) {
    console.log('underscore.js is required');
  } else {
    return window._;
  }
});
