'use strict';

describe('services', function () {
  var $rootScope;
  var $scope;
  var $httpBackend;
  var mockNotification;

  beforeEach(module('uchiwa'));

  beforeEach(function() {
    mockNotification = jasmine.createSpyObj('mockNotification', ['error', 'success']);
    module(function($provide) {
      $provide.value('Notification', mockNotification);
    });
  });

  beforeEach(inject(function (_$rootScope_, _$httpBackend_) {
    $httpBackend = _$httpBackend_;
    $rootScope = _$rootScope_;
    $scope = $rootScope.$new();
    $httpBackend.expect('GET', 'config').respond(200, {Uchiwa:{Refresh: 10}});
  }));

  describe('Aggregates', function() {
    describe('deleteMultiple', function() {
      it('removes multiple aggregates', inject(function(Aggregates) {
        $httpBackend.expectDELETE('/aggregates/foo?dc=us-east-1').respond(200, '');
        $httpBackend.expectDELETE('/aggregates/bar?dc=us-east-1').respond(200, '');

        var filtered = [{_id: 'us-east-1:foo'}, {_id: 'us-east-1:bar'}];
        var selected = {ids: {'us-east-1:foo': true, 'us-east-1:bar': true}};

        Aggregates.deleteMultiple(filtered, selected)
        .then(function(result) {
          // It should remove the deleted items
          expect(result).toEqual([]);
        });
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('removes a single aggregates', inject(function(Aggregates) {
        $httpBackend.expectDELETE('/aggregates/foo?dc=us-east-1').respond(200, '');

        var filtered = [{_id: 'us-east-1:foo'}, {_id: 'us-east-1:bar'}];
        var selected = {ids: {'us-east-1:foo': true, 'us-east-1:bar': false}};

        Aggregates.deleteMultiple(filtered, selected)
        .then(function(result) {
          // It should remove the deleted item
          expect(result).toEqual([filtered[1]]);
        });
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error with one of the aggregate', inject(function(Aggregates) {
        $httpBackend.expectDELETE('/aggregates/foo?dc=us-east-1').respond(200, '');
        $httpBackend.expectDELETE('/aggregates/bar?dc=us-east-1').respond(500, '');

        var filtered = [{_id: 'us-east-1:foo'}, {_id: 'us-east-1:bar'}];
        var selected = {ids: {'us-east-1:foo': true, 'us-east-1:bar': true}};

        Aggregates.deleteMultiple(filtered, selected);

        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });

    describe('deleteSingle', function() {
      it('removes an aggregate', inject(function(Aggregates) {
        $httpBackend.expectDELETE('/aggregates/foo?dc=us-east-1').respond(200, '');
        Aggregates.deleteSingle('us-east-1:foo')
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error', inject(function(Aggregates) {
        $httpBackend.expectDELETE('/aggregates/bar?dc=us-east-1').respond(500, '');
        Aggregates.deleteSingle('us-east-1:bar')
        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });
  });

  describe('backendService', function () {
    describe('getHealth', function() {
      it('emit a signal when health endpoint is down', inject(function(backendService) {
        spyOn($rootScope, "$emit");
        $httpBackend.expect('GET', 'health').respond(500, 'Error 500');
        backendService.getHealth();
        $httpBackend.flush();
        expect($rootScope.$emit).toHaveBeenCalledWith('notification', 'error', 'Uchiwa is having trouble updating its data. Try to refresh the page if this issue persists.');

      }));

      it('emit a signal when metrics endpoint is down', inject(function(backendService) {
        spyOn($rootScope, "$emit");
        $httpBackend.expect('GET', 'metrics').respond(500, 'Error 500');
        backendService.getMetrics();
        $httpBackend.flush();
        expect($rootScope.$emit).toHaveBeenCalledWith('notification', 'error', 'Uchiwa is having trouble updating its data. Try to refresh the page if this issue persists.');

      }));
      afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation()
        $httpBackend.verifyNoOutstandingRequest()
      })
    });
  });

  describe('Checks', function () {
    describe('issueCheckRequest', function() {
      it('sends a POST check request', inject(function (Checks) {
        $httpBackend.expectPOST('/request',
        '{"check":"foo","dc":"us-east-1","subscribers":"linux"}')
        .respond(200, '');

        Checks.issueCheckRequest('us-east-1', 'foo', 'linux')
        $httpBackend.flush();
      }));
    });

    describe('issueMulipleCheckRequest', function() {
      it('sends a single check requests', inject(function (Checks) {
        $httpBackend.expectPOST('/request',
        '{"check":"foo","dc":"us-east-1","subscribers":"linux"}')
        .respond(200, '');

        var filtered = [
          {_id: 'us-east-1:foo', dc: 'us-east-1', name: 'foo', subscribers: 'linux'}
        ];
        var selected = {ids: {'us-east-1:foo': true}};

        Checks.issueMulipleCheckRequest(filtered, selected);
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('sends multiple check requests', inject(function (Checks) {
        $httpBackend.expectPOST('/request',
        '{"check":"foo","dc":"us-east-1","subscribers":"linux"}')
        .respond(200, '');

        $httpBackend.expectPOST('/request',
        '{"check":"bar","dc":"us-west-1","subscribers":"windows"}')
        .respond(200, '');

        var filtered = [
          {_id: 'us-east-1:foo', dc: 'us-east-1', name: 'foo', subscribers: 'linux'},
          {_id: 'us-west-1:bar', dc: 'us-west-1', name: 'bar', subscribers: 'windows'}
        ];
        var selected = {ids: {'us-east-1:foo': true, 'us-west-1:bar': true}};

        Checks.issueMulipleCheckRequest(filtered, selected);
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error', inject(function (Checks) {
        $httpBackend.expectPOST('/request',
        '{"check":"foo","dc":"us-east-1","subscribers":"linux"}')
        .respond(500, '');

        var filtered = [
          {_id: 'us-east-1:foo', dc: 'us-east-1', name: 'foo', subscribers: 'linux'}
        ];
        var selected = {ids: {'us-east-1:foo': true}};

        Checks.issueMulipleCheckRequest(filtered, selected);
        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });

    describe('silence', function() {
      it('calls the Silenced service', inject(function (Checks, Silenced) {
        spyOn(Silenced, 'create').and.callThrough();

        var filtered = [{_id: 'foo'}, {_id: 'bar'}, {_id: 'qux'}];
        var selected = {ids: {foo: true, qux: true}};

        Checks.silence(filtered, selected);
        expect(Silenced.create).toHaveBeenCalledWith(null, [{_id: 'foo'}, {_id: 'qux'}]);
        expect(selected.all).toEqual(false);
      }));
    });
  });

  describe('Clients', function () {
    describe('deleteCheckResult', function () {
      it('calls the Results.delete function', inject(function (Clients, Results) {
        spyOn(Results, 'delete').and.callThrough();
        Clients.deleteCheckResult('foo/bar/qux');
        expect(Results.delete).toHaveBeenCalledWith('foo/bar/qux');
      }));
    });

    describe('deleteMultiple', function() {
      it('removes multiple clients', inject(function(Clients) {
        $httpBackend.expectDELETE('/clients/foo?dc=us-east-1').respond(200, '');
        $httpBackend.expectDELETE('/clients/bar?dc=us-east-1').respond(200, '');

        var filtered = [{_id: 'us-east-1:foo'}, {_id: 'us-east-1:bar'}];
        var selected = {ids: {'us-east-1:foo': true, 'us-east-1:bar': true}};

        Clients.deleteMultiple(filtered, selected)
        .then(function(result) {
          // It should remove the deleted items
          expect(result).toEqual([]);
        });
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('removes a single client', inject(function(Clients) {
        $httpBackend.expectDELETE('/clients/foo?dc=us-east-1').respond(200, '');

        var filtered = [{_id: 'us-east-1:foo'}, {_id: 'us-east-1:bar'}];
        var selected = {ids: {'us-east-1:foo': true, 'us-east-1:bar': false}};

         Clients.deleteMultiple(filtered, selected)
        .then(function(result) {
          // It should remove the deleted item
          expect(result).toEqual([filtered[1]]);
        });
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error with one of the aggregate', inject(function(Clients) {
        $httpBackend.expectDELETE('/clients/foo?dc=us-east-1').respond(200, '');
        $httpBackend.expectDELETE('/clients/bar?dc=us-east-1').respond(500, '');

        var filtered = [{_id: 'us-east-1:foo'}, {_id: 'us-east-1:bar'}];
        var selected = {ids: {'us-east-1:foo': true, 'us-east-1:bar': true}};

        Clients.deleteMultiple(filtered, selected);

        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });

    describe('deleteSingle', function() {
      it('removes a client', inject(function(Clients) {
        $httpBackend.expectDELETE('/clients/foo?dc=us-east-1').respond(200, '');
        Clients.deleteSingle('us-east-1/foo')
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error', inject(function(Clients) {
        $httpBackend.expectDELETE('/clients/bar?dc=us-east-1').respond(500, '');
        Clients.deleteSingle('us-east-1:bar')
        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });

    describe('resolveEvent', function () {
      it('calls the Events.resolve function', inject(function (Clients, Events) {
        spyOn(Events, 'resolve').and.callThrough();
        Clients.resolveEvent('foo/bar/qux');
        expect(Events.resolve).toHaveBeenCalledWith('foo/bar/qux');
      }));
    });

    describe('searchCheckHistory', function() {
      it('returns the right check from the client history', inject(function (Clients) {
        var history = [{check: 'foo', last_status: 0}, {check: 'bar', last_status: 1}];
        var expectedCheck = {check: 'bar', last_status: 1};
        expect(Clients.searchCheckHistory('bar', history)).toEqual(expectedCheck);
      }));
    });

    describe('silence', function() {
      it('calls the Silenced service', inject(function (Clients, Silenced) {
        spyOn(Silenced, 'create').and.callThrough();

        var filtered = [{_id: 'foo'}, {_id: 'bar'}, {_id: 'qux'}];
        var selected = {ids: {foo: true, qux: true}};

        Clients.silence(filtered, selected);
        expect(Silenced.create).toHaveBeenCalledWith(null, [{_id: 'foo'}, {_id: 'qux'}]);
        expect(selected.all).toEqual(false);
      }));
    });
  });

  describe('Events', function () {
    describe('resolveMultiple', function() {
      it('removes multiple events', inject(function(Events) {
        $httpBackend.expectDELETE('/events/foo/bar?dc=us-east-1').respond(200, '');
        $httpBackend.expectDELETE('/events/baz/qux?dc=us-east-1').respond(200, '');

        var filtered = [{_id: 'us-east-1/foo/bar'}, {_id: 'us-east-1/baz/qux'}];
        var selected = {ids: {'us-east-1/foo/bar': true, 'us-east-1/baz/qux': true}};

        Events.resolveMultiple(filtered, selected)
        .then(function(result) {
          // It should remove the deleted items
          expect(result).toEqual([]);
        });
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('removes a single aggregates', inject(function(Events) {
        $httpBackend.expectDELETE('/events/foo/bar?dc=us-east-1').respond(200, '');

        var filtered = [{_id: 'us-east-1/foo/bar'}, {_id: 'us-east-1/baz/qux'}];
        var selected = {ids: {'us-east-1/foo/bar': true, 'us-east-1/baz/qux': false}};

        Events.resolveMultiple(filtered, selected)
        .then(function(result) {
          // It should remove the deleted item
          expect(result).toEqual([filtered[1]]);
        });
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error with one of the aggregate', inject(function(Events) {
        $httpBackend.expectDELETE('/events/foo/bar?dc=us-east-1').respond(200, '');
        $httpBackend.expectDELETE('/events/baz/qux?dc=us-east-1').respond(500, '');

        var filtered = [{_id: 'us-east-1/foo/bar'}, {_id: 'us-east-1/baz/qux'}];
        var selected = {ids: {'us-east-1/foo/bar': true, 'us-east-1/baz/qux': true}};

        Events.resolveMultiple(filtered, selected);

        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });

    describe('resolveSingle', function() {
      it('resolves an event', inject(function(Events) {
        $httpBackend.expectDELETE('/events/foo/bar?dc=us-east-1').respond(200, '');
        Events.resolveSingle('us-east-1/foo/bar')
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error', inject(function(Events) {
        $httpBackend.expectDELETE('/events/foo/bar?dc=us-east-1').respond(500, '');
        Events.resolveSingle('us-east-1/foo/bar')
        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });

    describe('silence', function() {
      it('calls the Silenced service', inject(function (Events, Silenced) {
        spyOn(Silenced, 'create').and.callThrough();

        var filtered = [{_id: 'foo'}, {_id: 'bar'}, {_id: 'qux'}];
        var selected = {ids: {foo: true, qux: true}};

        Events.silence(filtered, selected);
        expect(Silenced.create).toHaveBeenCalledWith(null, [{_id: 'foo'}, {_id: 'qux'}]);
        expect(selected.all).toEqual(false);
      }));
    });
  });

  describe('Results', function () {
    describe('delete', function() {
      it('delete a check result', inject(function(Results) {
        $httpBackend.expectDELETE('/results/foo/bar?dc=us-east-1').respond(200, '');
        Results.delete('us-east-1/foo/bar')
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error', inject(function(Results) {
        $httpBackend.expectDELETE('/results/foo/bar?dc=us-east-1').respond(500, '');
        Results.delete('us-east-1/foo/bar')
        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
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

  describe('Silenced', function () {
    describe('clearEntries', function() {
      it('delete multiple silence entries', inject(function (Silenced) {
        spyOn(Silenced, 'delete').and.callThrough();

        var entries = [
          {_id: 'foo:bar', selected: true},
          {_id: 'baz:qux', selected: true},
          {_id: 'foo:baz', selected: false},
        ];
        Silenced.clearEntries(entries);

        expect(Silenced.delete).toHaveBeenCalledWith('foo:bar');
        expect(Silenced.delete).toHaveBeenCalledWith('baz:qux');
      }));
    });

    describe('createEntries', function() {
      it('creates multiple silence entries for clients', inject(function (Silenced) {
        spyOn(Silenced, 'post').and.callThrough();

        var items = [
          {dc: 'us-east-1', name: 'foo'},
          {dc: 'us-west-1', name: 'bar'}
        ];
        var itemType = 'client';
        var options = {expire: 3600, expire_on_resolve: false, reason: 'Lorem Ipsum'}
        var expectedPayloads = [
          {
            dc: 'us-east-1',
            expire: 3600,
            expire_on_resolve: false,
            reason: 'Lorem Ipsum',
            subscription: 'client:foo'
          },
          {
            dc: 'us-west-1',
            expire: 3600,
            expire_on_resolve: false,
            reason: 'Lorem Ipsum',
            subscription: 'client:bar'
          }
        ];

        Silenced.createEntries(items, itemType, options);

        expect(Silenced.post).toHaveBeenCalledWith(expectedPayloads[0]);
        expect(Silenced.post).toHaveBeenCalledWith(expectedPayloads[1]);
      }));

      it('creates silence entry for a check', inject(function (Silenced) {
        spyOn(Silenced, 'post').and.callThrough();

        var items = [{dc: 'us-east-1', name: 'foo'}];
        var itemType = 'check';
        var options = {};
        var expectedPayload = {dc: 'us-east-1', check: 'foo'};

        Silenced.createEntries(items, itemType, options);

        expect(Silenced.post).toHaveBeenCalledWith(expectedPayload);
      }));

      it('creates silence entry for an event', inject(function (Silenced) {
        spyOn(Silenced, 'post').and.callThrough();

        var items = [{dc: 'us-east-1', check: {name: 'cpu'}, client: {name: 'foo'}}];
        var itemType = 'check';
        var options = {};
        var expectedPayload = {dc: 'us-east-1', check: 'cpu', subscription: 'client:foo'};

        Silenced.createEntries(items, itemType, options);

        expect(Silenced.post).toHaveBeenCalledWith(expectedPayload);
      }));

      it('creates silence entry for a subscription', inject(function (Silenced) {
        spyOn(Silenced, 'post').and.callThrough();

        var items = [];
        var itemType = 'subscription';
        var options = {ac: {dc: 'us-east-1', subscription: 'foo'}}
        var expectedPayload = {dc: 'us-east-1', subscription: 'foo'};

        Silenced.createEntries(items, itemType, options);

        expect(Silenced.post).toHaveBeenCalledWith(expectedPayload);
      }));

      it('supports custom expiration', inject(function (Silenced) {
        spyOn(Silenced, 'post').and.callThrough();

        var items = [{dc: 'us-east-1', name: 'foo'}];
        var itemType = 'check';
        var options = {expire: 'custom', to: null};
        var expectedPayload = {dc: 'us-east-1', check: 'foo', expire: ''};

        Silenced.createEntries(items, itemType, options);

        expect(Silenced.post).toHaveBeenCalledWith(expectedPayload);
      }));
    });

    describe('delete', function() {
      it('sends a POST request to the /silenced/clear endpoint', inject(function (Silenced) {
        $httpBackend.expectPOST('/silenced/clear',
        '{"dc":"foo","id":"bar"}')
        .respond(200, '');

        Silenced.delete('foo:bar');
        $httpBackend.flush();
      }));
    });

    describe('deleteMultiple', function() {
      it('removes multiple silenced entries', inject(function(Silenced) {
        $httpBackend.expectPOST('/silenced/clear', '{"dc":"foo","id":"bar"}')
        .respond(200, '');
        $httpBackend.expectPOST('/silenced/clear', '{"dc":"baz","id":"qux"}')
        .respond(200, '');

        var filtered = [{_id: 'foo:bar'}, {_id: 'baz:qux'}];
        var selected = {ids: {'foo:bar': true, 'baz:qux': true}};

        Silenced.deleteMultiple(filtered, selected)
        .then(function(result) {
          // It should remove the deleted items
          expect(result).toEqual([]);
        });
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('removes a single aggregates', inject(function(Silenced) {
        $httpBackend.expectPOST('/silenced/clear', '{"dc":"foo","id":"bar"}')
        .respond(200, '');

        var filtered = [{_id: 'foo:bar'}, {_id: 'baz:qux'}];
        var selected = {ids: {'foo:bar': true, 'baz:qux': false}};

        Silenced.deleteMultiple(filtered, selected)
        .then(function(result) {
          // It should remove the deleted item
          expect(result).toEqual([filtered[1]]);
        });
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error with one of the aggregate', inject(function(Silenced) {
        $httpBackend.expectPOST('/silenced/clear', '{"dc":"foo","id":"bar"}')
        .respond(200, '');
        $httpBackend.expectPOST('/silenced/clear', '{"dc":"baz","id":"qux"}')
        .respond(500, '');

        var filtered = [{_id: 'foo:bar'}, {_id: 'baz:qux'}];
        var selected = {ids: {'foo:bar': true, 'baz:qux': true}};

        Silenced.deleteMultiple(filtered, selected);

        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });

    describe('deleteSingle', function() {
      it('sends a POST request to the /silenced/clear endpoint', inject(function (Silenced) {
        $httpBackend.expectPOST('/silenced/clear', '{"dc":"foo","id":"bar"}')
        .respond(200, '');

        Silenced.deleteSingle('foo:bar');
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error', inject(function (Silenced) {
        $httpBackend.expectPOST('/silenced/clear', '{"dc":"foo","id":"bar"}')
        .respond(500, '');

        Silenced.deleteSingle('foo:bar');
        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });

    describe('findEntriesFromItems', function() {
      it('handles errors', inject(function (Silenced) {
        var items = [undefined]
        Silenced.findEntriesFromItems([], [undefined]);
      }));

      it('sets the silenced attribute to false if missing', inject(function (Silenced) {
        var items = [{_id: 'us-east-1:foo'}, {_id: 'us-east-1:bar'}];
        Silenced.findEntriesFromItems([], items);
        expect(items[0].silenced).toEqual(false);
        expect(items[1].silenced).toEqual(false);
      }));

      it('sets the silenced_by attribute for clients', inject(function (Silenced) {
        var items = [{_id: 'us-east-1:foo', name: 'foo', silenced: true}];
        Silenced.findEntriesFromItems([], items);
        expect(items[0].silenced_by).toEqual(['client:foo:*']);
      }));

      it('returns silenced entries from the provided items', inject(function (Silenced) {
        var entries = [
          {_id: 'us-east-1:client:foo:*'},
          {_id: 'us-east-1:client:bar:*'},
          {_id: 'us-west-1:client:foo:*'}
        ];
        var items = [
          {_id: 'us-east-1:foo', dc: 'us-east-1', name: 'foo', silenced: true, silenced_by: ['client:foo:*']},
          {_id: 'us-east-1:bar', dc: 'us-east-1', name: 'bar', silenced: true, silenced_by: ['client:foo:*']}
        ];
        var foundEntries = Silenced.findEntriesFromItems(entries, items);
        expect(foundEntries).toEqual([entries[0]]);
      }));
    });

    describe('post', function() {
      it('sends a POST request to the /silenced endpoint', inject(function (Silenced) {
        $httpBackend.expectPOST('/silenced',
        '{"foo":"bar"}')
        .respond(200, '');

        Silenced.post({foo: 'bar'});
        $httpBackend.flush();
      }));
    });

    describe('query', function() {
      it('sends a GET request to the /silenced endpoint', inject(function (Silenced) {
        $httpBackend.expectGET('/silenced').respond(200, '["foo","bar"]');

        Silenced.query({foo: 'bar'}).$promise.then(
          function(results){
            expect(results.length).toEqual(2);
          }
        );
        $httpBackend.flush();
      }));
    });
  });

  describe('Stashes', function () {
    describe('deleteMultiple', function() {
      it('removes multiple stashes', inject(function(Stashes) {
        $httpBackend.expectDELETE('/stashes/foo%2Fbar?dc=us-east-1').respond(200, '');
        $httpBackend.expectDELETE('/stashes/baz%2Fqux?dc=us-west-1').respond(200, '');

        var filtered = [{_id: 'us-east-1/foo/bar'}, {_id: 'us-west-1/baz/qux'}];
        var selected = {ids: {'us-east-1/foo/bar': true, 'us-west-1/baz/qux': true}};

        Stashes.deleteMultiple(filtered, selected)
        .then(function(result) {
          // It should remove the deleted items
          expect(result).toEqual([]);
        });
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('removes a single stash', inject(function(Stashes) {
        $httpBackend.expectDELETE('/stashes/foo%2Fbar?dc=us-east-1').respond(200, '');

        var filtered = [{_id: 'us-east-1/foo/bar'}, {_id: 'us-west-1/baz/qux'}];
        var selected = {ids: {'us-east-1/foo/bar': true, 'us-west-1/baz/qux': false}};

        Stashes.deleteMultiple(filtered, selected)
        .then(function(result) {
          // It should remove the deleted item
          expect(result).toEqual([filtered[1]]);
        });
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error with one of the stash', inject(function(Stashes) {
        $httpBackend.expectDELETE('/stashes/foo%2Fbar?dc=us-east-1').respond(200, '');
        $httpBackend.expectDELETE('/stashes/baz%2Fqux?dc=us-west-1').respond(500, '');

        var filtered = [{_id: 'us-east-1/foo/bar'}, {_id: 'us-west-1/baz/qux'}];
        var selected = {ids: {'us-east-1/foo/bar': true, 'us-west-1/baz/qux': true}};

        Stashes.deleteMultiple(filtered, selected)

        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });

    describe('deleteSingle', function() {
      it('sends a POST request to the /silenced/clear endpoint', inject(function (Stashes) {
        $httpBackend.expectDELETE('/stashes/foo%2Fbar?dc=us-east-1').respond(200, '');

        Stashes.deleteSingle('us-east-1/foo/bar');
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error', inject(function (Stashes) {
        $httpBackend.expectDELETE('/stashes/foo%2Fbar?dc=us-east-1').respond(500, '');

        Stashes.deleteSingle('us-east-1/foo/bar');
        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });

    describe('get', function () {
      it('returns null if the stashes are empty', inject(function (Stashes){
        expect(Stashes.get([], 'foo')).toEqual(null);
      }));

      it('returns null if the stash is missing', inject(function (Stashes){
        expect(Stashes.get([{_id: 'foo/bar'}, {_id: 'foo/foo'}], 'foo')).toEqual(null);
      }));

      it('returns the stash found', inject(function (Stashes){
        expect(Stashes.get([{name: 'foo/foo'}, {_id: 'foo/bar'}, {_id: 'foo/foo'}], 'foo/foo')).toEqual({_id: 'foo/foo'});
      }));
    });
  });

  describe('Subscriptions', function () {
    describe('query', function() {
      it('sends a GET request to the /subscriptions endpoint', inject(function (Subscriptions) {
        $httpBackend.expectGET('/subscriptions').respond(200, '["foo","bar"]');

        Subscriptions.query({foo: 'bar'}).$promise.then(
          function(results){
            expect(results.length).toEqual(2);
          }
        );
        $httpBackend.flush();
      }));
    });
  });


  describe('underscore', function () {
    it('should define _', inject(function (underscore) {
      expect(underscore).toBe(window._);
    }));
  });
});
