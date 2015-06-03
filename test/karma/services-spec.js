'use strict';

describe('services', function () {
  var $rootScope;
  var $scope;

  beforeEach(module('uchiwa'));
  beforeEach(inject(function (_$rootScope_) {
    $rootScope = _$rootScope_;
    $scope = $rootScope.$new();
  }));

  describe('clientsService', function () {
    describe('resolveEvent', function () {
      it('should return false when neither client & check are undefined or not objects', inject(function (clientsService) {
        expect(clientsService.resolveEvent('foo', null, null)).toEqual(false);
        expect(clientsService.resolveEvent('foo', undefined)).toEqual(false);
      }));

      it('should emit HTTP POST to /resolveEvent', inject(function (clientsService, backendService) {
        var expectedPayload = {dc: 'foo', payload: {client: 'bar', check: 'qux'}};
        spyOn(backendService, 'resolveEvent').and.callThrough();
        clientsService.resolveEvent('foo', {name: 'bar'}, {check: 'qux'});
        expect(backendService.resolveEvent).toHaveBeenCalledWith(expectedPayload);
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
