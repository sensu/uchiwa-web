'use strict';

describe('filters', function () {
  var $filter;
  var mockConfig;

  beforeEach(module('uchiwa'));

  beforeEach(function() {
    mockConfig = jasmine.createSpyObj('mockConfig', ['dateFormat']);
    mockConfig.dateFormat.and.callFake(function() {return 'YYYY-MM-DD HH:mm:ss'});
    module(function($provide) {
      $provide.value('Config', mockConfig);
    });
  });

  beforeEach(inject(function (_$filter_, $httpBackend) {
    $filter = _$filter_;
    $httpBackend.whenGET(/events\.html.*/).respond(200, '');
  }));

  describe('arrayLength', function () {
    it('should return 0 if null', inject(function (arrayLengthFilter) {
      expect(arrayLengthFilter(null)).toEqual(0);
    }));

    it('should return 0 if not an array', inject(function (arrayLengthFilter) {
      expect(arrayLengthFilter('string')).toEqual(0);
    }));

    it('should return proper array length', inject(function (arrayLengthFilter) {
      expect(arrayLengthFilter([0, 1, 2])).toEqual(3);
    }));
  });

  describe('arrayToString', function () {
    it('should return 0 if null', inject(function (arrayToStringFilter) {
      expect(arrayToStringFilter(null)).toEqual('');
    }));

    it('should return 0 if not an array', inject(function (arrayToStringFilter) {
      expect(arrayToStringFilter('string')).toEqual('string');
    }));

    it('should return proper array length', inject(function (arrayToStringFilter) {
      expect(arrayToStringFilter([0, 1, 2])).toEqual('0 1 2');
    }));
  });

  describe('buildEvents', function () {
    it('should not accept anything else than an array', inject(function (buildEventsFilter) {
      expect(buildEventsFilter('string')).toEqual('string');
      expect(buildEventsFilter({})).toEqual({});
    }));

    it('handles missing check OR client objects', inject(function (buildEventsFilter) {
      var events = [
        { check: { source: 'foo' }},
        { client: {name: 'baz' }}
      ];
      var expectedEvents = [
        { check: { source: 'foo'}, sourceName: 'foo'},
        { check: {}, client: {name: 'baz'}, sourceName: 'baz'}
      ];
      expect(buildEventsFilter(events)).toEqual(expectedEvents);
    }));

    it('handles missing check AND client objects', inject(function (buildEventsFilter) {
      var events = [{}];
      var expectedEvents = [{sourceName: 'unknown'}];
      expect(buildEventsFilter(events)).toEqual(expectedEvents);
    }));

    it('should add sourceName properties', inject(function (buildEventsFilter) {
      var events = [
        { check: { source: 'foo'}, client: { name: 'bar'}},
        { check: { name: 'qux'}, client: {name: 'baz'}}
      ];
      var expectedEvents = [
        { check: { source: 'foo'}, client: { name: 'bar'}, sourceName: 'foo'},
        { check: { name: 'qux'}, client: {name: 'baz'}, sourceName: 'baz'}
      ];
      expect(buildEventsFilter(events)).toEqual(expectedEvents);
    }));

    it("adds last_ok if it's missing", inject(function (buildEventsFilter) {
      function lastOkOf(event) {
        return buildEventsFilter([event])[0].last_ok
      }

      var event_with_last_ok = {
        check: { source: 'foo' },
        last_ok: 1465161618
      };

      var event_with_keepalive = {
        check: {
          source: 'bar',
          name: 'keepalive',
          output: "No keepalive sent from client for 287530 seconds (>=180)",
        },
        timestamp: 1465161618
      };

      var event_with_null_last_ok = {
        check: {
          interval: 240,
          timestamp: 1465161200
        },
        occurrences: 5,
        client: { name: 'baz'},
        last_ok: null
      };

      var event_with_interval_and_occurences = {
        check: {
          interval: 240,
          timestamp: 1465161200
        },
        occurrences: 5,
        client: { name: 'baz'},
      };

      expect(lastOkOf(event_with_last_ok)).toEqual(1465161618);
      expect(lastOkOf(event_with_keepalive)).toEqual(1464874088);
      expect(lastOkOf(event_with_interval_and_occurences)).toEqual(1465160000);
      expect(lastOkOf(event_with_null_last_ok)).toEqual(1465160000);
    }));
  });

  describe('buildStashes', function () {
    it('should not accept anything else than an array', inject(function (buildStashesFilter) {
      expect(buildStashesFilter('string')).toEqual('string');
      expect(buildStashesFilter({})).toEqual({});
    }));

    it('should add client & check properties', inject(function (buildStashesFilter) {
      var stashes = [
        {path: 'silence/foo/bar'},
        {path: 'silence/'},
        {path: 'watchdog/baz'}
      ];
      var expectedStashes = [
        {type: 'silence', client: 'foo', check: 'bar', path: 'silence/foo/bar'},
        {type: 'silence', client: null, check: null, path: 'silence/'},
        {type: 'watchdog', client: 'baz', check: null, path: 'watchdog/baz'}
      ];
      expect(buildStashesFilter(stashes)).toEqual(expectedStashes);
    }));
  });

  describe('displayObject', function () {
    it('should display object', inject(function (displayObjectFilter) {
      expect(displayObjectFilter('test')).toBe('test');
      expect(displayObjectFilter(['test', 'test1', 'test2'])).toBe('test, test1, test2');
      expect(displayObjectFilter({key: 'value'})).toEqual({key: 'value'});
    }));
  });

  describe('getTimestamp', function () {
    it('handles bogus values', inject(function (getTimestampFilter) {
      expect(getTimestampFilter(null)).toBe('');
      expect(getTimestampFilter(undefined)).toBe('');
      expect(getTimestampFilter('test')).toBe('test');
      expect(getTimestampFilter(1)).toBe(1);
    }));

    it('converts epoch to human readable date', inject(function (getTimestampFilter) {
      expect(getTimestampFilter(1410908218)).toBe(moment.utc('2014-09-16 22:56:58', 'YYYY-MM-DD HH:mm:ss').local().format('YYYY-MM-DD HH:mm:ss'));
    }));
  });

  describe('getExpirationTimestamp', function () {
    it('should convert epoch to human readable date', inject(function (getExpirationTimestampFilter) {
      expect(getExpirationTimestampFilter('test')).toBe('Unknown');
      expect(getExpirationTimestampFilter(900)).toMatch('\\d\\d\\d\\d-\\d\\d-');
      expect(getExpirationTimestampFilter(-1)).toBe('Never');
    }));
  });

  describe('encodeURIComponent', function () {
    it('should encode URI', inject(function (encodeURIComponentFilter) {
      expect(encodeURIComponentFilter('dc name/client name?check=check name')).toBe('dc%20name%2Fclient%20name%3Fcheck%3Dcheck%20name');
    }));
  });

  describe('getStatusClass', function () {
    it('should return CSS class based on status', inject(function (getStatusClassFilter) {
      expect(getStatusClassFilter(0)).toBe('success');
      expect(getStatusClassFilter(1)).toBe('warning');
      expect(getStatusClassFilter(2)).toBe('critical');
      expect(getStatusClassFilter(3)).toBe('unknown');
      expect(getStatusClassFilter('foo')).toBe('unknown');
    }));
  });

  describe('getAckClass', function () {
    it('should return icon based on acknowledgment', inject(function (getAckClassFilter) {
      expect(getAckClassFilter(true)).toBe('fa-volume-off fa-stack-1x');
      expect(getAckClassFilter(null)).toBe('fa-volume-up');
    }));
  });

  describe('hideSilenced', function () {
    it('should only hide silenced events when hideSilenced is true', inject(function (hideSilencedFilter) {
      var events = [
        {id: 'foo', silenced: true},
        {id: 'bar', silenced: false}
      ];
      var expectedEvents = [
        {id: 'bar', silenced: false}
      ];
      expect(hideSilencedFilter(events, false)).toEqual(events);
      expect(hideSilencedFilter(events, true)).toEqual(expectedEvents);
    }));
  });

  describe('hideClientsSilenced', function () {
    it('should only hide events from silenced clients when hideClientsSilenced is true', inject(function (hideClientsSilencedFilter) {
      var events = [
        {id: 'foo', client: {silenced: true}},
        {id: 'bar', client: {silenced: false}}
      ];
      var expectedEvents = [
        {id: 'bar', client: {silenced: false}}
      ];
      expect(hideClientsSilencedFilter(events, false)).toEqual(events);
      expect(hideClientsSilencedFilter(events, true)).toEqual(expectedEvents);
    }));
  });


  describe('hideOccurrences', function () {

    it('should only hide events when the number occurrences are less than the check occurrences parameter and hideOccurrences is true', inject(function (hideOccurrencesFilter) {
      var events = [
        {id: 'foo', occurrences: 2, check: {occurrences: 2}},
        {id: 'bar', occurrences: 1, check: {occurrences: 2}}
      ];
      var expectedEvents = [
        {id: 'foo', occurrences: 2, check: {occurrences: 2}}
      ];
      expect(hideOccurrencesFilter(events, false)).toEqual(events);
      expect(hideOccurrencesFilter(events, true)).toEqual(expectedEvents);
    }));

    it('should not hide events when there is no check.occurrences parameter or where check.occurrences is NaN', inject(function (hideOccurrencesFilter) {
      var events = [
        {id: 'foo', occurrences: 2, check: {occurrences: 2}},
        {id: 'bar', occurrences: 1, check: { }},
        {id: 'baz', occurrences: 1, check: {occurrences: 'foo'}}
      ];
      var expectedEvents = [
        {id: 'foo', occurrences: 2, check: {occurrences: 2}},
        {id: 'bar', occurrences: 1, check: { }},
        {id: 'baz', occurrences: 1, check: {occurrences: 'foo'}}
      ];
      expect(hideOccurrencesFilter(events, false)).toEqual(events);
      expect(hideOccurrencesFilter(events, true)).toEqual(expectedEvents);
    }));
  });

  describe('highlight', function () {
    it('converts an object to JSON string', inject(function (highlightFilter) {
      expect(highlightFilter({foo: 'bar'})).toContain('<span class="hljs-string">"bar"</span>');
    }));
    it('does not convert an iframe', inject(function (highlightFilter) {
      var obj = {foo: true};
      obj['$$unwrapTrustedValue'] = function(){};
      expect(highlightFilter(obj)).toBe(obj);
    }));
  });

  describe('imagey', function () {
    it('should find an image and display it', inject(function (imageyFilter) {
      expect(imageyFilter(false)).toBe(false);
      expect(imageyFilter('http://foo.bar')).toBe('http://foo.bar');
      expect(imageyFilter('https://foo.bar')).toBe('https://foo.bar');
      expect(imageyFilter('http://foo.bar/qux.gif')).toBe('<img src="http://foo.bar/qux.gif">');
      expect(imageyFilter('https://foo.bar/qux.gif')).toBe('<img src="https://foo.bar/qux.gif">');
      expect(imageyFilter('https://foo.bar:443/qux.gif')).toBe('<img src="https://foo.bar:443/qux.gif">');
    }));
  });

  describe('status', function () {
    it('returns all items if the status is empty', inject(function (statusFilter) {
      var events = [
        {id: 'foo', check: {status: 1}},
        {id: 'bar', check: {status: 2}},
        {id: 'baz', check: {status: 3}}
      ];
      expect(statusFilter(events, '')).toEqual(events);
    }));
    it('returns warnings if the status is 1', inject(function (statusFilter) {
      var events = [
        {id: 'foo', check: {status: 1}},
        {id: 'bar', check: {status: 2}},
        {id: 'baz', check: {status: 3}}
      ];
      var expectedEvents = [
        {id: 'foo', check: {status: 1}}
      ];
      expect(statusFilter(events, '1')).toEqual(expectedEvents);
    }));
    it('returns criticals if the status is 2', inject(function (statusFilter) {
      var events = [
        {id: 'foo', check: {status: 1}},
        {id: 'bar', check: {status: 2}},
        {id: 'baz', check: {status: 3}}
      ];
      var expectedEvents = [
        {id: 'bar', check: {status: 2}}
      ];
      expect(statusFilter(events, '2')).toEqual(expectedEvents);
    }));
    it('returns unknowns if the status is 3 or greater', inject(function (statusFilter) {
      var events = [
        {id: 'foo', check: {status: 1}},
        {id: 'bar', check: {status: 2}},
        {id: 'baz', check: {status: 3}},
        {id: 'bax', check: {status: 4}},
        {id: 'bax', check: {status: 1234123}}
      ];
      var expectedEvents = [
        {id: 'baz', check: {status: 3}},
        {id: 'bax', check: {status: 4}},
        {id: 'bax', check: {status: 1234123}}
      ];
      expect(statusFilter(events, '3')).toEqual(expectedEvents);
    }));
    it('matches the status exactly rather than a fuzzy match', inject(function (statusFilter) {
      var events = [
        {id: 'foo', check: {status: 1111}},
        {id: 'bar', check: {status: 1}}
      ];
      var expectedEvents = [
        {id: 'bar', check: {status: 1}}
      ];
      expect(statusFilter(events, '1')).toEqual(expectedEvents);
    }));
  });

  describe('regex', function () {
    it('returns all items if the query is empty', inject(function (regexFilter) {
      var items = [{foo: 'bar'}];
      expect(regexFilter(items, '')).toEqual(items);
    }));

    it('performs a simple search with a value', inject(function (regexFilter) {
      var items = [
        {foo: 'bar'},
        {qux: 'bar'},
        {baz: 'foo'}
      ];
      expect(regexFilter(items, 'bar')).toEqual([items[0], items[1]]);
    }));

    it('performs a simple search with a key-value', inject(function (regexFilter) {
      var items = [
        {foo: 'bar'},
        {qux: 'bar'},
        {baz: 'foo'}
      ];
      expect(regexFilter(items, 'foo:bar')).toEqual([items[0]]);
    }));

    it('performs a regex search with a value', inject(function (regexFilter) {
      var items = [
        {foo: 'canada'},
        {bar: 'vatican'},
        {qux: 'cameroon'}
      ];
      expect(regexFilter(items, 'can+')).toEqual([items[0], items[1]]);
    }));

    it('performs a recursive regex search with a value', inject(function (regexFilter) {
      var items = [
        {foo: 'canada'},
        {foo: {baz: 'vatican'}},
        {qux: {baz: 'cameroon'}}
      ];
      expect(regexFilter(items, 'can+')).toEqual([items[0], items[1]]);
    }));

    it('performs a regex search with a key-value', inject(function (regexFilter) {
      var items = [
        {foo: 'canada'},
        {foo: 'vatican'},
        {foo: 'cameroon'}
      ];
      expect(regexFilter(items, 'foo:can*')).toEqual(items);
      expect(regexFilter(items, 'foo:can+')).toEqual([items[0], items[1]]);
      expect(regexFilter(items, 'foo:^can')).toEqual([items[0]]);
    }));

    it('performs a recursive regex search with a key-value', inject(function (regexFilter) {
      var items = [
        {country: 'canada'},
        {check: {country: 'vatican'}},
        {qux: {region: 'canada'}}
      ];
      expect(regexFilter(items, 'country:can+')).toEqual([items[0], items[1]]);
    }));

    it('performs a search within an array', inject(function (regexFilter) {
      var items = [
        {foo: ['foo', 'bar']},
        {foo: ['foo', 'baz']}
      ];
      expect(regexFilter(items, 'foo:bar')).toEqual([items[0]]);
    }));

    it('performs a negative lookahead', inject(function (regexFilter) {
      var items = [
        {foo: 'canada'},
        {foo: 'usa'}
      ];
      expect(regexFilter(items, 'foo:^((?!canada).)*$')).toEqual([items[1]]);
    }));

    it('performs a negative lookahead on check names in events', inject(function (regexFilter) {
      var items = [
        {check: {name: 'check-foo'}, client: {name: 'foo'}},
        {check: {name: 'check-bar'}, client: {name: 'foo'}},
        {check: {name: 'check-bar'}, client: {name: 'bar'}},
      ];
      expect(regexFilter(items, 'check:^((?!check-bar).)*$')).toEqual([items[0]]);
    }));

    it('performs a negative lookahead on client names in events', inject(function (regexFilter) {
      var items = [
        {check: {name: 'check-foo'}, client: {name: 'foo'}},
        {check: {name: 'check-bar'}, client: {name: 'foo'}},
        {check: {name: 'check-bar'}, client: {name: 'bar'}},
      ];
      expect(regexFilter(items, 'client:^((?!foo).)*$')).toEqual([items[2]]);
    }));
  });

  describe('richOutput', function () {
    it('handles bogus values', inject(function (richOutputFilter) {
      expect(richOutputFilter(null)).toBe('');
      expect(richOutputFilter(undefined)).toBe('');
    }));

    it('converts an image URL to a HTML image', inject(function (richOutputFilter) {
      expect(richOutputFilter('http://foo.bar/baz.gif')).toContain('<a href="http://foo.bar/baz.gif"><img src=');
    }));

    it('converts an URL to a HTML URL', inject(function (richOutputFilter) {
      expect(richOutputFilter('http://foo.bar/baz')).toContain('<a href="http://foo.bar/baz">');
    }));
  });

  describe('setMissingProperty', function () {
    it('should set to false a missing property', inject(function (setMissingPropertyFilter) {
      expect(setMissingPropertyFilter(undefined)).toBe(false);
      expect(setMissingPropertyFilter({foo: 'bar'})).toEqual({foo: 'bar'});
    }));
  });

  describe('subscriptions', function () {
    it('should filter subscriptions', inject(function (subscriptionsFilter, $filter) {
      expect(subscriptionsFilter([{name: 'test1', subscriptions: []}, {name: 'test2', subscriptions: ['linux']}], 'linux')).toEqual([{name: 'test2', subscriptions: ['linux']}]);
      expect(subscriptionsFilter([{name: 'test1', subscriptions: []}, {name: 'test2', subscriptions: ['linux']}], '')).toEqual([{name: 'test1', subscriptions: []}, {name: 'test2', subscriptions: ['linux']}]);
    }));
  });

  describe('type', function () {
    it('filters checks type', inject(function (typeFilter, $filter) {
      var items = [
        {name: 'foo'},
        {name: 'bar', type: 'standard'},
        {name: 'baz', type: 'metrics'}
      ];

      expect(typeFilter(items, '')).toEqual(items);
      expect(typeFilter(items, 'standard')).toEqual([items[0], items[1]]);
      expect(typeFilter(items, 'metrics')).toEqual([items[2]]);
    }));
  });

  describe('unique', function () {
    it('returns unique objects based on a key', inject(function (uniqueFilter) {
      var objects = [{dc: 'us-east-1', name: 'foo'}, {dc: 'us-east-1', name: 'bar'}, {dc: 'us-west-1', name: 'foo'}];
      expect(uniqueFilter(objects, 'name').length).toBe(2);
    }));
  });
});
