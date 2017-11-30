'use strict';

var filterModule = angular.module('uchiwa.filters', []);

filterModule.filter('arrayLength', function() {
  return function(array) {
    if (!array) { return 0; }
    if (array.constructor.toString().indexOf('Array') === -1) { return 0; }
    return array.length;
  };
});

filterModule.filter('arrayToString', function() {
  return function(array) {
    if (!array) { return ''; }
    if (array.constructor.toString().indexOf('Array') === -1) { return array; }
    return array.join(' ');
  };
});

filterModule.filter('buildEvents', function() {
  function estimateLastOk(event) {
    var check       = event.check,
        output      = check.output,
        occurrences = event.occurrences,
        timestamp   = event.timestamp || check.timestamp,
        interval    = check.interval,
        age,
        match;

    if (interval) {
      age = occurrences * interval;
    } else if (check.name === 'keepalive') {
      match = output && output.match(/\d+/);
      age = match && parseInt(match);
    }

    if (isNaN(age) || isNaN(timestamp)) {
      return;
    }

    return timestamp - age;
  }

  return function(events) {
    var lastOk;

    if (Object.prototype.toString.call(events) !== '[object Array]') {
      return events;
    }
    angular.forEach(events, function(event) {
      if (angular.isUndefined(event)) {
        return;
      }
      if (typeof(event.check) === 'undefined' && typeof(event.client) === 'undefined') {
        event.sourceName = 'unknown';
        return true;
      }
      else if (typeof(event.check) === 'undefined') {
        event.check = {};
      }
      event.sourceName = event.check.source || event.client.name;
      /* jshint -W106  */
      if (!('last_ok' in event) || event.last_ok === null) {
        lastOk = estimateLastOk(event);
        if (lastOk) { event.last_ok = lastOk; }
      }
      /* jshint +W106 */
    });
    return events;
  };
});

filterModule.filter('buildEventCount', function() {
  return function(events) {
    var eventCount = {};
    angular.forEach(events, function(event) {
      if (eventCount[event.check.name] === 'undefined' || !eventCount[event.check.name]) {
        eventCount[event.check.name] = 0;
      }
      eventCount[event.check.name] = eventCount[event.check.name] + 1;
    });
    var keys = [];
    keys = Object.keys(eventCount);
    var len = keys.length;
    keys.sort(function(a, b) {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
    var eventsCounted = {};
    for (var i = 0; i < len; i++)
    {
      var k = keys[i];
      eventsCounted[k] = eventCount[k];
    }
    eventCount = {};
    return eventsCounted;
  };
});

filterModule.filter('buildStashes', function() {
  return function(stashes) {
    if (Object.prototype.toString.call(stashes) !== '[object Array]') {
      return stashes;
    }
    angular.forEach(stashes, function(stash) {
      var path = stash.path.split('/');
      stash.type = path[0] || 'silence';
      stash.client = path[1] || null;
      stash.check = path[2] || null;
    });
    return stashes;
  };
});

filterModule.filter('collection', function () {
  return function(items) {
    return items;
  };
});

filterModule.filter('displayObject', function() {
  return function(input) {
    if(angular.isObject(input)) {
      if(input.constructor.toString().indexOf('Array') === -1) { return input; }
      return input.join(', ');
    }
    else {
      return input;
    }
  };
});

filterModule.filter('encodeURIComponent', function() {
  return window.encodeURIComponent;
});

filterModule.filter('getAckClass', function() {
  return function(isSilenced) {
    return (isSilenced) ? 'fa-volume-off fa-stack-1x' : 'fa-volume-up';
  };
});

filterModule.filter('getExpirationTimestamp', ['Config', function (Config) {
  return function(expire) {
    if (angular.isUndefined(expire) || isNaN(expire)) {
      return 'Unknown';
    }
    if (expire === -1) {
      return 'Never';
    }
    var expiration = (moment().unix() + expire) * 1000;
    return moment(expiration).format(Config.dateFormat());
  };
}]);

filterModule.filter('getStatusClass', function() {
  return function(status) {
    switch(status) {
      case 0:
        return 'success';
      case 1:
        return 'warning';
      case 2:
        return 'critical';
      default:
        return 'unknown';
    }
  };
});

filterModule.filter('getTimestamp', ['Config', function (Config) {
  return function(timestamp) {
    if (angular.isUndefined(timestamp) || timestamp === null) {
      return '';
    }
    if (isNaN(timestamp) || timestamp.toString().length !== 10) {
      return timestamp;
    }
    timestamp = timestamp * 1000;
    return moment(timestamp).format(Config.dateFormat());
  };
}]);

filterModule.filter('hideSilenced', function() {
  return function(events, hideSilenced) {
    if (Object.prototype.toString.call(events) !== '[object Array]') {
      return events;
    }
    if (events && hideSilenced) {
      return events.filter(function (item) {
        return item.silenced === false;
      });
    }
    return events;
  };
});

filterModule.filter('status', function() {
  return function(events, status) {
    // Return all events if no status filter is set
    if (status === '') {
      return events;
    }

    status = parseInt(status);

    // If the status is unknown return all statuses from 3 and up
    if (status === 3) {
      return events.filter(function (item) {
        return item.check.status >= status;
      });
    }
    else {
      return events.filter(function (item) {
        return item.check.status === status;
      });
    }
  };
});

filterModule.filter('hideClientsSilenced', function() {
  return function(events, hideClientsSilenced) {
    if (Object.prototype.toString.call(events) !== '[object Array]') {
      return events;
    }
    if (events && hideClientsSilenced) {
      return events.filter(function (item) {
        return item.client.silenced === false;
      });
    }
    return events;
  };
});

filterModule.filter('hideOccurrences', function() {
  return function(events, hideOccurrences) {
    if (Object.prototype.toString.call(events) !== '[object Array]') {
      return events;
    }
    if (events && hideOccurrences) {
      return events.filter(function (item) {
        if (('occurrences' in item.check) && !isNaN(item.check.occurrences)) {
          return item.occurrences >= item.check.occurrences;
        } else {
          return true;
        }
      });
    }
    return events;
  };
});

filterModule.filter('highlight', function() {
  return function(text) {
    if (typeof text === 'object') {
      if (text.hasOwnProperty('$$unwrapTrustedValue')) {
        return text;
      }
      var code = hljs.highlight('json', angular.toJson(text, true)).value;
      var output = '<pre class=\"hljs\">' + code + '</pre>';
      return output;
    }
    return text;
  };
});

filterModule.filter('imagey', function() {
  return function(url) {
    if (!url) {
      return url;
    }
    var IMG_URL_REGEX = /(href=['"]?)?https?:\/\/(?:[0-9a-zA-Z_\-\.\:]+)\/(?:[^'"]+)\.(?:jpe?g|gif|png)/g;
    return url.replace(IMG_URL_REGEX, function(match, href) {
      return (href) ? match : '<img src="' + match + '">';
    });
  };
});

filterModule.filter('objectIsEmpty', function() {
  return function(object) {
    return angular.equals({}, object);
  };
});

filterModule.filter('regex', function() {
  return function(items, query) {
    var results = [];
    var queries = query.split(':');
    var pattern = '';
    var testObject = function() {};

    // If we only have a value, without a key
    if (queries.length <= 1) {
      pattern = new RegExp(query);
      testObject = function(obj) {
        for (var k in obj) {
          if (typeof obj[k] === 'object') {
            if (testObject(obj[k])) {
              return true;
            }
          }
          if (pattern.test(obj[k])) {
            return true;
          }
        }
        return false;
      };
      // Retrieve all keys from an object
      angular.forEach(items, function(item) {
        if (testObject(item)) {
          results.push(item);
        }
      });
      return results;
    }

    // We have a key:value
    var key = queries[0];
    pattern = new RegExp(queries.slice(1).join());
    var isNegativeLookahead = /\?!/.test(pattern);

    testObject = function(obj, key) {
      for (var k in obj) {
        if (obj[k] && typeof obj[k] === 'object' && obj[k].constructor !== Array) {
          if (isNegativeLookahead && (k === 'check' || k === 'client') && k !== key) {
            continue;
          }
          if (testObject(obj[k], key)) {
            return true;
          }
          continue;
        }
        if ((k === key || ((key === 'check' || key === 'client') && k === 'name')) && pattern.test(obj[k])) {
          return true;
        }
      }
    };

    for (var i = 0; i < items.length; i++) {
      if (testObject(items[i], key)) {
        results.push(items[i]);
      }
    }
    return results;
  };
});

filterModule.filter('relativeTimestamp', function() {
  return function(timestamp) {
    if (isNaN(timestamp) || timestamp.toString().length !== 10) {
      return timestamp;
    }
    timestamp = timestamp * 1000;
    return moment(timestamp).startOf('minute').fromNow();
  };
});

filterModule.filter('richOutput', ['$filter', 'Helpers', '$sce', '$sanitize', '$interpolate', function($filter, Helpers, $sce, $sanitize, $interpolate) {
  return function(text) {
    var output = '';

    if (angular.isUndefined(text) || text === null) {
      return '';
    }

    if(typeof text === 'object') {
      if (text instanceof Array) {
        output = text.join(', ');
      } else {
        // We will highlight other objects with the "highlight" filter
        output = text;
      }
    } else if (typeof text === 'number' || typeof text === 'boolean') {
      output = $filter('getTimestamp')(text);
      output = output.toString();
    } else if (/^iframe:/.test(text)) {
      var iframeSrc = $sanitize(text.replace(/^iframe:/, ''));
      var exp = $interpolate('<span class="iframe"><iframe width="100%" src="{{iframeSrc}}"></iframe></span>')({ 'iframeSrc': iframeSrc });
      output = $sce.trustAsHtml(exp);
    } else if (Helpers.isUrl(text)) {
      var linkified = $filter('linky')(text);
      output = $filter('imagey')(linkified);
    } else {
      return text;
    }
    return output;
  };
}]);

filterModule.filter('setMissingProperty', function() {
  return function(property) {
    return property || false;
  };
});

filterModule.filter('subscriptions', function() {
  return function(objects, query) {
    if(query === '' || !objects) {
      return objects;
    }
    else {
      return objects.filter(function (item) {
        return item.subscriptions.indexOf(query) > -1;
      });
    }
  };
});

filterModule.filter('type', function() {
  return function(objects, type) {
    if(type === '' || !objects) {
      return objects;
    }
    else {
      return objects.filter(function (item) {
        if(type === 'standard') {
          return item.type === '' || item.type === 'standard' || !item.hasOwnProperty('type');
        }

        return item.type === type;
      });
    }
  };
});

filterModule.filter('unique', function() {
  return function(collection, key) {
    var results = [],
    values = [];

    angular.forEach(collection, function(item) {
      var value = item[key];
      if(values.indexOf(value) === -1) {
        values.push(value);
        results.push(item);
      }
    });

    return results;
  };
});
