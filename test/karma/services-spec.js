'use strict';

describe('services', function () {
  var $rootScope;
  var $scope;
  var $httpBackend;

  beforeEach(module('uchiwa'));
  beforeEach(inject(function (_$rootScope_, _$httpBackend_) {
    $httpBackend = _$httpBackend_;
    $rootScope = _$rootScope_;
    $scope = $rootScope.$new();
    $httpBackend.expect('GET', 'config').respond(200, {Uchiwa:{Refresh: 10}});
  }));

  describe('backendService', function () {
    describe('getHealth', function() {
      it('emit a signal when health endpoint is down', inject(function(backendService) {
	  spyOn($rootScope, "$emit");
	  $httpBackend.expect('GET', 'health').respond(500, 'Error 500');
          backendService.getHealth();
	  $httpBackend.flush();
	  expect($rootScope.$emit).toHaveBeenCalledWith('notification', 'error', 'Uchiwa is having trouble updating its data. Try to refresh the page if this issue persists.');
          $httpBackend.verifyNoOutstandingExpectation();
          $httpBackend.verifyNoOutstandingRequest();
	}));

      it('emit a signal when metrics endpoint is down', inject(function(backendService) {
	  spyOn($rootScope, "$emit");
	  $httpBackend.expect('GET', 'metrics').respond(500, 'Error 500');
          backendService.getMetrics();
	  $httpBackend.flush();
    expect($rootScope.$emit).toHaveBeenCalledWith('notification', 'error', 'Uchiwa is having trouble updating its data. Try to refresh the page if this issue persists.');
          $httpBackend.verifyNoOutstandingExpectation();
          $httpBackend.verifyNoOutstandingRequest();
	}));
    });
  });
  describe('clientsService', function () {
    describe('searchCheckHistory()', function() {
      it('returns the right check from the client history', inject(function (clientsService) {
        var history = [{check: 'foo', last_status: 0}, {check: 'bar', last_status: 1}];
        var expectedCheck = {check: 'bar', last_status: 1};
        expect(clientsService.searchCheckHistory('bar', history)).toEqual(expectedCheck);
      }));
    });

    describe('resolveEvent()', function () {
      it('should emit HTTP DELETE to /events', inject(function (clientsService, backendService) {
        spyOn(backendService, 'deleteEvent').and.callThrough();
        clientsService.resolveEvent('foo/bar/qux');
        expect(backendService.deleteEvent).toHaveBeenCalledWith('foo/bar/qux');
      }));
    });
  });

  describe('filterService', function () {
    describe('comparator', function () {
      it('returns true when the expected variable is an empty string', inject(function (filterService) {
        expect(filterService.comparator('foo', '')).toEqual(true);
      }));

      it('returns true when the actual & expected variable are strictly similar', inject(function (filterService) {
        expect(filterService.comparator('foo', 'foo')).toEqual(true);
      }));

      it('returns false when the actual & expected variable are not strictly similar', inject(function (filterService) {
        expect(filterService.comparator('foo', 'foobar')).toEqual(false);
      }));
    });
  });

  describe('helperService', function () {
    describe('deleteItems()', function () {
      it('calls the provided function for every selected item', inject(function (helperService, clientsService) {
        spyOn(clientsService, 'deleteClient').and.callThrough();

        var filtered = [{_id: 'foo'}, {_id: 'bar'}, {_id: 'qux'}];
        var selected = {ids: {foo: true, qux: true}};

        helperService.deleteItems(clientsService.deleteClient, filtered, selected);
        expect(clientsService.deleteClient).toHaveBeenCalledWith('foo');
        expect(clientsService.deleteClient).not.toHaveBeenCalledWith('bar');
        expect(clientsService.deleteClient).toHaveBeenCalledWith('qux');
        expect(selected.all).toEqual(false);
      }));
    });

    describe('selectAll()', function () {
      it('marks all filtered items as selected', inject(function (helperService) {
        var filtered = [{_id: 'foo'}, {_id: 'bar'}];
        var selected = {all: true, ids: {foo: true}};
        var expectedSelected = {foo: true, bar: true};
        helperService.selectAll(filtered, selected);
        expect(selected.ids).toEqual(expectedSelected);
      }));
      it('marks all filtered items as unselected', inject(function (helperService) {
        var filtered = [{_id: 'foo'}, {_id: 'bar'}];
        var selected = {all: false, ids: {foo: true}};
        var expectedSelected = {foo: false, bar: false};
        helperService.selectAll(filtered, selected);
        expect(selected.ids).toEqual(expectedSelected);
      }));
    });

    describe('silenceItems()', function () {
      it('calls the provided function for every selected item', inject(function (helperService, stashesService) {
        spyOn(stashesService, 'stash').and.callThrough();

        var filtered = [{_id: 'foo'}, {_id: 'bar'}, {_id: 'qux'}];
        var selected = {ids: {foo: true, qux: true}};

        helperService.silenceItems(stashesService.stash, filtered, selected);
        expect(stashesService.stash).toHaveBeenCalledWith(null, [{_id: 'foo'}, {_id: 'qux'}]);
        expect(selected.all).toEqual(false);
      }));
    });

    describe('updateSelected()', function () {
      it('does not remove any items when a filter is removed', inject(function (helperService) {
        var newValues = ['', false, ''];
        var oldValues = ['', false, 'baz'];
        var filtered = [{_id: 'foo'}];
        var selected = {ids: {foo: true, bar: true}}
        var expectedSelected = {ids: {foo: true, bar: false}}
        helperService.updateSelected(newValues, oldValues, filtered, selected);
        expect(selected).not.toEqual(expectedSelected);
      }));
      it('removes any selected items that are filtered', inject(function (helperService) {
        var newValues = ['', false, 'baz'];
        var oldValues = ['', false, ''];
        var filtered = [{_id: 'foo'}];
        var selected = {ids: {foo: true, bar: true}}
        var expectedSelected = {ids: {foo: true, bar: false}}
        helperService.updateSelected(newValues, oldValues, filtered, selected);
        expect(selected).toEqual(expectedSelected);
      }));
    });
  });


  describe('navbarServices', function () {
    describe('health method', function (navbarServices) {
      it('returns no alert when all datacenters are ok', inject(function (navbarServices) {
        $rootScope.health = { foo: { output: "ok" }, bar: { output: "ok" } };
        navbarServices.health();
        expect($rootScope.alerts).toEqual([]);
      }));

      it('returns a single alert when one datacenters is not ok', inject(function (navbarServices) {
        $rootScope.health = {sensu: { foo: { output: "ok" }, bar: { output: "critical" }}};
        navbarServices.health();
        expect($rootScope.alerts).toEqual([ 'Datacenter <strong>bar</strong> returned: <em>critical</em>' ]);
      }));

      it('does not return an alert when the /health API enpoint does not respond', inject(function (navbarServices) {
        $rootScope.health = "foobar";
        navbarServices.health();
        expect($rootScope.alerts).toEqual([]);
      }));
    });
  });

  describe('routingService', function () {
    it('should have a go method', inject(function (routingService) {
      expect(routingService.go).toBeDefined();
    }));
    it('should have a deleteEmptyParameter method', inject(function (routingService) {
      expect(routingService.deleteEmptyParameter).toBeDefined();
    }));
    it('should have a initFilters method', inject(function (routingService) {
      expect(routingService.initFilters).toBeDefined();
    }));
    it('should have a permalink method', inject(function (routingService) {
      expect(routingService.permalink).toBeDefined();
    }));
    it('should have a updateFilters method', inject(function (routingService) {
      expect(routingService.updateFilters).toBeDefined();
    }));
    it('should have a updateValue method', inject(function (routingService) {
      expect(routingService.updateValue).toBeDefined();
    }));

    describe('go()', function() {
      it('should call $location.url', inject(function (routingService, $location) {
        var uri = '/testing';
        spyOn($location, 'url');
        routingService.go(uri);
        expect($location.url).toHaveBeenCalledWith(uri);
      }));

      it('should encode URIs', inject(function (routingService, $location) {
        var uri = '/this needs !@#$ encoding';
        spyOn($location, 'url');
        routingService.go(uri);
        expect($location.url).not.toHaveBeenCalledWith(uri);
        expect($location.url).toHaveBeenCalledWith(encodeURI(uri));
      }));
    });
  });

  describe('stashesService', function () {
    it('should have a deleteStash method', inject(function (stashesService) {
      expect(stashesService.deleteStash).toBeDefined();
    }));

    describe('find', function () {
      it('returns the proper stash from an unknown object', inject(function (stashesService){
        var stashes = [
          { dc: 'east', path: 'silence/foo/bar' },
          { dc: 'west', path: 'silence/qux' }
        ];
        var object = {
          check: 'bar',
          client: 'foo',
          dc: 'east'
        }
        var stash = stashesService.find(stashes, object);
        expect(stash).toEqual({dc: 'east', path: 'silence/foo/bar' });

        object = {
          name: 'qux',
          dc: 'west'
        }
        stash = stashesService.find(stashes, object);
        expect(stash).toEqual({dc: 'west', path: 'silence/qux' });
      }));
    });

    describe('getExpirationFromDateRange', function () {
      it('returns the proper expiration & timestamp attributes', inject(function (stashesService){
        var stash = {content: { to: '2015-02-01 00:00:01'}}
        stash = stashesService.getExpirationFromDateRange(stash);
        expect(stash.expiration).toBeLessThan(-10000000);
        expect(stash.content.timestamp).toBeGreaterThan(1000000000);
      }));
    });

    describe('getPath', function () {
      it('returns a stash path from a check object', inject(function (stashesService){
        var check = {
          check: {
            name: 'bar'
          },
          client: {
            name: 'foo'
          }
        }
        var path = stashesService.getPath(check);
        expect(path).toEqual('silence/foo/bar');
      }));

      it('returns a stash path from a check output object', inject(function (stashesService){
        var check = {
          check: 'bar',
          client: 'foo'
        }
        var path = stashesService.getPath(check);
        expect(path).toEqual('silence/foo/bar');
      }));

      it('returns a stash path from a client object', inject(function (stashesService){
        var client = {
          name: 'foo'
        }
        var path = stashesService.getPath(client);
        expect(path).toEqual('silence/foo');
      }));
          });

    describe('submit', function () {
      it('calls backendService.postStash with the proper payload', inject(function (stashesService, backendService) {
        spyOn(backendService, 'postStash').and.callThrough();
        var timestamp = Math.floor(new Date()/1000);

        // silence/client
        var expectedPayload = {content: {reason: '', source: 'uchiwa', timestamp: timestamp}, dc: 'foo', path: 'silence/bar'};
        stashesService.submit({name: 'bar', acknowledged: false, dc: 'foo'}, {path: ['bar', '']});
        expect(backendService.postStash).toHaveBeenCalledWith(expectedPayload);

        // silence/client/check
        expectedPayload = {content: {reason: '', source: 'uchiwa', timestamp: timestamp}, dc: 'foo', path: 'silence/bar/qux'};
        stashesService.submit({client: {name: 'bar'}, check: {name: 'qux'}, acknowledged: false, dc: 'foo'}, {path: ['bar', 'qux']});
        expect(backendService.postStash).toHaveBeenCalledWith(expectedPayload);
      }));
    });
  });

  describe('underscore', function () {
    it('should define _', inject(function (underscore) {
      expect(underscore).toBe(window._);
    }));
  });
});
