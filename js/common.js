'use strict';

var common = angular.module('uchiwa.common', []);

common.service('Helpers', ['$filter', '$q', '$rootScope',
function($filter, $q, $rootScope) {
  // deleteMultiple deletes multiple selected items from a filtered list
  this.deleteMultiple = function(fn, filtered, selected) {
    var self = this;
    var promises = [];
    angular.forEach(selected.ids, function(value, key) {
      if (value) {
        var deffered = $q.defer();
        selected.ids[key] = false;
        fn(key).then(function() {
          filtered = self.removeItemById(key, filtered);
          deffered.resolve(key);
        }, function() {
          deffered.reject();
        });
        promises.push(deffered.promise);
      }
    });
    selected.all = false;
    $rootScope.skipOneRefresh = true;
    return $q.all(promises).then(function() {
      return filtered;
    });
  };
  // equals determines if the actual and expected variables are equivalent
  this.equals = function(actual, expected) {
    if (angular.isUndefined(expected) || expected === '') {
      return true;
    }
    return angular.equals(actual, expected);
  };
  // escapeDot escapes a leading dot for compatibility with angular $resource
  this.escapeDot = function(value) {
    if (value.substring(0,1) === '.') {
      return '\\' + value;
    }
    return value;
  };
  // findIdInItems returns an item within the items with a provided id
  this.findIdInItems = function(id, items) {
    if (angular.isUndefined(id) || angular.isUndefined(items) || !angular.isArray(items)) {
      return null;
    }
    for (var i = 0, len = items.length; i < len; i++) {
      if (angular.isObject(items[i]) && angular.isDefined(items[i]._id)) {
        if (items[i]._id === id) {
          return items[i];
        }
      }
    }
    return null;
  };
  // getSelected returns all filtered items that are selected
  this.getSelected = function(filtered, selected) {
    var items = [];
    angular.forEach(selected.ids, function(value, key) {
      if (value) {
        var found = $filter('filter')(filtered, {_id: key}, true);
        if (found.length) {
          items.push(found[0]);
          selected.ids[key] = false;
        }
      }
    });
    selected.all = false;
    return items;
  };
  // hasElementSelected returns true if at least one element is selected
  this.hasElementSelected = function(selected) {
    var isSelected = false;
    angular.forEach(selected.ids, function(value) {
      if (!isSelected) {
        if (value) {
          isSelected = true;
        }
      }
    });
    return isSelected;
  };
  this.isUrl = function(value) {
    var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    return regexp.test(value);
  };
  // openLink stops event propagation if an A tag is clicked
  this.openLink = function($event) {
    if($event.srcElement.tagName === 'A'){
      $event.stopPropagation();
    }
  };
  // removeItemById removes an item, using its id, from an array of items
  this.removeItemById = function(id, items) {
    return $filter('filter')(items, {_id: '!'+ id});
  };
  // secondsBetweenDates returns the seconds between a start and a end datetime
  this.secondsBetweenDates = function(start, end) {
    if (angular.isUndefined(start) || angular.isUndefined(end)) {
      return 'unknown';
    }
    var amDifference = $filter('amDifference');
    return amDifference(moment(end), moment(start), 'seconds');
  };
  // selectAll marks all filtered items as selected or unselected
  this.selectAll = function(filtered, selected) {
    angular.forEach(filtered, function(value) {
      selected.ids[value._id] = selected.all;
    });
  };
  // splidId takes an id and splits it into two parts
  this.splitId = function(id) {
    var results = [];
    var index = id.indexOf('/');

    // Also support silenced ids
    if (index === -1) {
      index = id.indexOf(':');
    }

    results.push(id.substr(0, index));
    results.push(id.substr(index + 1));
    return results;
  };
  // updateSelected updates the selected array to remove any filtered items
  this.updateSelected = function(newValues, oldValues, filtered, selected) {
    // Check if we need to exclude any items
    var excludeItems = false;
    for (var i = 0; i < newValues.length; i++) {
      if ((newValues[i] !== '' && newValues[i]) && oldValues[i] !== newValues[i]) {
        excludeItems = true;
        break;
      }
    }
    if (!excludeItems) {
      return;
    }
    angular.forEach(selected.ids, function(value, key) {
      if (value) {
        var found = $filter('filter')(filtered, {_id: key});
        if (!found.length) {
          selected.ids[key] = false;
        }
      }
    });
  };
}
]);

common.service('Notification', ['toastr',
function(toastr) {
  this.error = function(message) {
    var self = this;
    var title = 'Oops! Something went wrong.';
    self.new(message, title, 'error');
  };
  this.new = function(message, title, type) {
    toastr[type](message, title);
  };
  this.success = function(message) {
    var self = this;
    var titles = ['Great!', 'All right!', 'Fantastic!', 'Excellent!', 'Good news!'];
    var rand = Math.floor((Math.random() * titles.length) + 1);
    var title = titles[rand];
    self.new(message, title, 'success');
  };
}
]);
