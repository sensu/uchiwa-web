'use strict';

var providerModule = angular.module('uchiwa.providers', []);

/**
* Notifications
*/
providerModule.provider('notification', function () {
  this.$get = function (toastr, toastrConfig, $cookieStore) {
    var toastrSettings = $cookieStore.get('uchiwa_toastrSettings');
    if(!toastrSettings) {
      toastrSettings = { 'positionClass': 'toast-bottom-right', 'preventOpenDuplicates': true, 'timeOut': 7500 };
      $cookieStore.put('uchiwa_toastrSettings', toastrSettings);
    }
    angular.extend(toastrConfig, toastrSettings);
    return function (type, message) {
      if (type !== 'error' && type !== 'warning' && type !== 'success') {
        type = 'info';
      }
      var title = '';
      if (type === 'success') {
        var titles = ['Great!', 'All right!', 'Fantastic!', 'Excellent!', 'Good news!'];
        var rand = Math.floor((Math.random() * titles.length) + 1);
        title = titles[rand];
      }
      else if (type === 'error') {
        title = 'Oops! Something went wrong.';
      }
      toastr[type](message, title);
    };
  };
});
