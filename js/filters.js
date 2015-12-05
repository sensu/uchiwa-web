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
  return function(events) {
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

filterModule.filter('filterSubscriptions', function() {
  return function(object, query) {
    if(query === '' || !object) {
      return object;
    }
    else {
      return object.filter(function (item) {
        return item.subscriptions.indexOf(query) > -1;
      });
    }
  };
});

filterModule.filter('getAckClass', function() {
  return function(isAcknowledged) {
    return (isAcknowledged) ? 'fa-volume-off fa-stack-1x' : 'fa-volume-up';
  };
});

filterModule.filter('getExpireTimestamp', ['conf', function (conf) {
  return function(stash) {
    if (angular.isUndefined(stash) || isNaN(stash.expire)) {
      return 'Unknown';
    }
    if (stash.expire === -1) {
      return 'Never';
    }
    var expiration = (moment().unix() + stash.expire) * 1000;
    return moment(expiration).format(conf.date);
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

filterModule.filter('getTimestamp', ['conf', function (conf) {
  return function(timestamp) {
    if (angular.isUndefined(timestamp) || timestamp === null) {
      return '';
    }
    if (isNaN(timestamp) || timestamp.toString().length !== 10) {
      return timestamp;
    }
    timestamp = timestamp * 1000;
    return moment(timestamp).format(conf.date);
  };
}]);

filterModule.filter('hideSilenced', function() {
  return function(events, hideSilenced) {
    if (Object.prototype.toString.call(events) !== '[object Array]') {
      return events;
    }
    if (events && hideSilenced) {
      return events.filter(function (item) {
        return item.acknowledged === false;
      });
    }
    return events;
  };
});

filterModule.filter('hideClientsSilenced', function() {
  return function(events, hideClientsSilenced) {
    if (Object.prototype.toString.call(events) !== '[object Array]') {
      return events;
    }
    if (events && hideClientsSilenced) {
      return events.filter(function (item) {
        return item.client.acknowledged === false;
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

filterModule.filter('relativeTimestamp', function() {
  return function(timestamp) {
    if (isNaN(timestamp) || timestamp.toString().length !== 10) {
      return timestamp;
    }
    timestamp = timestamp * 1000;
    return moment(timestamp).startOf('minute').fromNow();
  };
});

filterModule.filter('richOutput', ['$filter', '$sce', '$sanitize', '$interpolate', function($filter, $sce, $sanitize, $interpolate) {
  return function(text) {
    var output = '';

    if (angular.isUndefined(text) || text === null) {
      return '';
    }

    if(typeof text === 'object') {
      if (text instanceof Array) {
        output = text.join(', ');
      } else {
        var code = hljs.highlight('json', angular.toJson(text, true)).value;
        output = '<pre class=\"hljs\">' + code + '</pre>';
      }
    } else if (typeof text === 'number' || typeof text === 'boolean') {
      output = text.toString();
    } else if (/^iframe:/.test(text)) {
      var iframeSrc = $sanitize(text.replace(/^iframe:/, ''));
      output = $sce.trustAsHtml($interpolate('<span class="iframe"><iframe width="100%" src="{{iframeSrc}}"></iframe></span>')({ 'iframeSrc': iframeSrc }));
    }
    else {
      var linkified = $filter('linky')(text, '_blank');
      output = $filter('imagey')(linkified);
    }
    return output;
  };
}]);

filterModule.filter('setMissingProperty', function() {
  return function(property) {
    return property || false;
  };
});
