'use strict';

describe('services', function () {
  var $rootScope;
  var $scope;
  var $httpBackend;
  var mockCookieStore;
  var mockNotification;
  var mockRichOutputFilter;

  beforeEach(module('uchiwa'));

  beforeEach(function() {
    mockCookieStore = jasmine.createSpyObj('mockCookieStore', ['get', 'put']);
    mockCookieStore.get.and.callFake(function(key) {return (key === '') ? false : 'foo' });
    mockNotification = jasmine.createSpyObj('mockNotification', ['error', 'success']);
    mockRichOutputFilter = jasmine.createSpy('richOutputFilter');
    module(function($provide) {
      $provide.value('$cookieStore', mockCookieStore);
      $provide.value('Notification', mockNotification);
      $provide.value('richOutputFilter', mockRichOutputFilter);
      $provide.constant('DefaultConfig', {
        AppName: 'Uchiwa',
        DateFormat: 'YYYY-MM-DD HH:mm:ss',
        DefaultTheme: 'uchiwa-default',
        DisableNoExpiration: true,
        LogoURL: 'foo.png',
        Refresh: 10000,
        RequireSilencingReason: true
      });
    });
  });

  beforeEach(inject(function (_$rootScope_, _$httpBackend_) {
    $httpBackend = _$httpBackend_;
    $rootScope = _$rootScope_;
    $scope = $rootScope.$new();
    $httpBackend.whenGET(/events\.html.*/).respond(200, '');
    $httpBackend.whenGET('datacenters').respond([]);
  }));

  describe('Aggregates', function() {
    describe('deleteMultiple', function() {
      it('removes multiple aggregates', inject(function(Aggregates) {
        $httpBackend.expectDELETE('aggregates/foo?dc=us-east-1').respond(200, '');
        $httpBackend.expectDELETE('aggregates/bar?dc=us-east-1').respond(200, '');

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
        $httpBackend.expectDELETE('aggregates/foo?dc=us-east-1').respond(200, '');

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
        $httpBackend.expectDELETE('aggregates/foo?dc=us-east-1').respond(200, '');
        $httpBackend.expectDELETE('aggregates/bar?dc=us-east-1').respond(500, '');

        var filtered = [{_id: 'us-east-1:foo'}, {_id: 'us-east-1:bar'}];
        var selected = {ids: {'us-east-1:foo': true, 'us-east-1:bar': true}};

        Aggregates.deleteMultiple(filtered, selected);

        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });

    describe('deleteSingle', function() {
      it('removes an aggregate', inject(function(Aggregates) {
        $httpBackend.expectDELETE('aggregates/foo?dc=us-east-1').respond(200, '');
        Aggregates.deleteSingle('us-east-1:foo')
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error', inject(function(Aggregates) {
        $httpBackend.expectDELETE('aggregates/bar?dc=us-east-1').respond(500, '');
        Aggregates.deleteSingle('us-east-1:bar')
        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });
  });

  describe('Checks', function () {
    describe('issueCheckRequest', function() {
      it('sends a POST check request', inject(function (Checks) {
        $httpBackend.expectPOST('request',
        '{"check":"foo","dc":"us-east-1","subscribers":"linux"}')
        .respond(200, '');

        Checks.issueCheckRequest('us-east-1', 'foo', 'linux')
        $httpBackend.flush();
      }));
    });

    describe('issueMulipleCheckRequest', function() {
      it('sends a single check requests', inject(function (Checks) {
        $httpBackend.expectPOST('request',
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
        $httpBackend.expectPOST('request',
        '{"check":"foo","dc":"us-east-1","subscribers":"linux"}')
        .respond(200, '');

        $httpBackend.expectPOST('request',
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
        $httpBackend.expectPOST('request',
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
        $httpBackend.expectDELETE('clients/foo?dc=us-east-1').respond(200, '');
        $httpBackend.expectDELETE('clients/bar?dc=us-east-1').respond(200, '');

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
        $httpBackend.expectDELETE('clients/foo?dc=us-east-1').respond(200, '');

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
        $httpBackend.expectDELETE('clients/foo?dc=us-east-1').respond(200, '');
        $httpBackend.expectDELETE('clients/bar?dc=us-east-1').respond(500, '');

        var filtered = [{_id: 'us-east-1:foo'}, {_id: 'us-east-1:bar'}];
        var selected = {ids: {'us-east-1:foo': true, 'us-east-1:bar': true}};

        Clients.deleteMultiple(filtered, selected);

        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });

    describe('deleteSingle', function() {
      it('removes a client', inject(function(Clients) {
        $httpBackend.expectDELETE('clients/foo?dc=us-east-1').respond(200, '');
        Clients.deleteSingle('us-east-1/foo')
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error', inject(function(Clients) {
        $httpBackend.expectDELETE('clients/bar?dc=us-east-1').respond(500, '');
        Clients.deleteSingle('us-east-1:bar')
        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });

    describe('findCheckHistory', function() {
      it('returns the right check from the client history', inject(function (Clients) {
        var history = [{check: 'foo', last_status: 0}, {check: 'bar', last_status: 1}];
        var expectedCheck = {check: 'bar', last_status: 1};
        Clients.findCheckHistory(history, 'bar')
        .then(
          function(check) {
            expect(check).toEqual(expectedCheck);
          }
        );
      }));

      it('handles undefined arguments', inject(function (Clients) {
        var err = jasmine.createSpy('err');
        Clients.findCheckHistory(undefined, undefined).then(
          function(){},
          function() {
            err();
          }
        );
        $scope.$digest();
        expect(err).toHaveBeenCalled();
      }));
    });

    describe('findPanels', function() {
      it('extracts iframes', inject(function (Clients) {
        var lastResult = {
          content: '<span class="iframe"><iframe width="100%" src="http://127.0.0.1"></iframe></span>',
          foo: 'bar'
        };
        var expectedLastResult = {
          foo: 'bar'
        };
        var expectedPanels = {content: lastResult.content};
        Clients.findPanels(lastResult).then(
          function(panels) {
            expect(lastResult).toEqual(expectedLastResult);
            expect(panels).toEqual(expectedPanels)
          }
        );
        $scope.$digest();
      }));


      it('extracts images', inject(function (Clients) {
        var lastResult = {
          cat: '<img src="http://127.0.0.1/cat.gif">',
          foo: 'bar'
        };
        var expectedLastResult = {
          foo: 'bar'
        };
        var expectedPanels = {cat: lastResult.cat};
        Clients.findPanels(lastResult).then(
          function(panels) {
            expect(lastResult).toEqual(expectedLastResult);
            expect(panels).toEqual(expectedPanels)
          }
        );
        $scope.$digest();
      }));

      it('does not extract from command', inject(function (Clients) {
        var lastResult = {
          command: '<img src="http://127.0.0.1/cat.gif">',
          foo: 'bar'
        };
        var expectedLastResult = {
          command: '<img src="http://127.0.0.1/cat.gif">',
          foo: 'bar'
        };
        var expectedImages = {cat: '<img src="http://127.0.0.1/cat.gif">'};
        Clients.findPanels(lastResult).then(
          function(images) {
            expect(lastResult).toEqual(expectedLastResult);
          }
        );
        $scope.$digest();
      }));

      it('handles undefined arguments', inject(function (Clients) {
        var err = jasmine.createSpy('err');
        Clients.findPanels(null).then(
          function(){},
          function() {
            err();
          }
        );
        $scope.$digest();
        expect(err).toHaveBeenCalled();
      }));
    });

    describe('resolveEvent', function () {
      it('calls the Events.resolve function', inject(function (Clients, Events) {
        spyOn(Events, 'resolve').and.callThrough();
        Clients.resolveEvent('foo/bar/qux');
        expect(Events.resolve).toHaveBeenCalledWith('foo/bar/qux');
      }));
    });

    describe('richOutput', function() {
      it('calls the richOutput filter', inject(function (Clients) {
        var lastResult = {foo: 123456789, bar: 'qux'};
        Clients.richOutput(lastResult);
        $scope.$digest();
        expect(mockRichOutputFilter).toHaveBeenCalledWith(123456789);
        expect(mockRichOutputFilter).toHaveBeenCalledWith('qux');
      }));

      it('does not apply the richOutput filter to status', inject(function (Clients) {
        var lastResult = {status: 123456789};
        Clients.richOutput(lastResult);
        $scope.$digest();
        expect(mockRichOutputFilter).not.toHaveBeenCalledWith(123456789);
      }));

      it('handles undefined arguments', inject(function (Clients) {
        var err = jasmine.createSpy('err');
        Clients.richOutput(null).then(
          function(){},
          function() {
            err();
          }
        );
        $scope.$digest();
        expect(err).toHaveBeenCalled();
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

  describe('Config', function () {
    describe('appName', function () {
      it('returns the proper value', inject(function (Config) {
        expect(Config.appName()).toEqual('Uchiwa');
      }));
    });

    describe('dateFormat', function () {
      it('returns the proper value', inject(function (Config) {
        expect(Config.dateFormat()).toEqual('YYYY-MM-DD HH:mm:ss');
      }));
    });

    describe('defaultTheme', function () {
      it('returns the proper value', inject(function (Config) {
        expect(Config.defaultTheme()).toEqual('uchiwa-default');
      }));
    });

    describe('disableNoExpiration', function () {
      it('returns the proper value', inject(function (Config) {
        expect(Config.disableNoExpiration()).toEqual(true);
      }));
    });

    describe('logoURL', function () {
      it('returns the proper value', inject(function (Config) {
        expect(Config.logoURL()).toEqual('foo.png');
      }));
    });

    describe('refresh', function () {
      it('returns the proper value', inject(function (Config) {
        expect(Config.refresh()).toEqual(10000);
      }));
    });
  });

  describe('Events', function () {
    describe('resolveMultiple', function() {
      it('removes multiple events', inject(function(Events) {
        $httpBackend.expectDELETE('events/foo/bar?dc=us-east-1').respond(200, '');
        $httpBackend.expectDELETE('events/baz/qux?dc=us-east-1').respond(200, '');

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
        $httpBackend.expectDELETE('events/foo/bar?dc=us-east-1').respond(200, '');

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
        $httpBackend.expectDELETE('events/foo/bar?dc=us-east-1').respond(200, '');
        $httpBackend.expectDELETE('events/baz/qux?dc=us-east-1').respond(500, '');

        var filtered = [{_id: 'us-east-1/foo/bar'}, {_id: 'us-east-1/baz/qux'}];
        var selected = {ids: {'us-east-1/foo/bar': true, 'us-east-1/baz/qux': true}};

        Events.resolveMultiple(filtered, selected);

        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });

    describe('resolveSingle', function() {
      it('resolves an event', inject(function(Events) {
        $httpBackend.expectDELETE('events/foo/bar?dc=us-east-1').respond(200, '');
        Events.resolveSingle('us-east-1/foo/bar')
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error', inject(function(Events) {
        $httpBackend.expectDELETE('events/foo/bar?dc=us-east-1').respond(500, '');
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
        $httpBackend.expectDELETE('results/foo/bar?dc=us-east-1').respond(200, '');
        Results.delete('us-east-1/foo/bar')
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error', inject(function(Results) {
        $httpBackend.expectDELETE('results/foo/bar?dc=us-east-1').respond(500, '');
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

  describe('Sidebar', function () {
    describe('getAlerts', function() {
      it('finds unhealty datacenters', inject(function (Sidebar) {
        var health = {
          sensu: {
            foo: {status: 0},
            bar: {output: 'foobar', status: 2}
          },
          uchiwa: 'ok'
        };

        expect(Sidebar.getAlerts(health).length).not.toEqual(0);
      }));

      it('returns an empty array if no error', inject(function (Sidebar) {
        var health = {sensu: { foo: {status: 0}}, uchiwa: 'ok'};
        expect(Sidebar.getAlerts(health).length).toEqual(0);
      }));

      it('returns an error with Uchiwa API', inject(function (Sidebar) {
        var health = {sensu: null, uchiwa: 'foobar'};
        expect(Sidebar.getAlerts(health)).toEqual([health.uchiwa]);
      }));

      it('handles bad argument', inject(function (Sidebar) {
        var health = undefined;
        expect(Sidebar.getAlerts(health).length).toEqual(0);

        health = 'foo';
        expect(Sidebar.getAlerts(health).length).toEqual(0);
      }));
    });
  });

  describe('Silenced', function () {
    describe('addEntry', function() {
      it('adds a silenced entry when only a check is provided', inject(function (Silenced) {
        spyOn(Silenced, 'post').and.callThrough();

        var entry = {check: 'foobar', datacenter: 'foo', expire: 900, reason: 'bar'};
        var expected = {dc: 'foo', expire: 900, reason: 'bar', check: 'foobar'};
        Silenced.addEntry(entry);
        expect(Silenced.post).toHaveBeenCalledWith(expected);
      }));

      it('adds a silenced entry when only a subscription is provided', inject(function (Silenced) {
        spyOn(Silenced, 'post').and.callThrough();

        var entry = {datacenter: 'foo', expire: 900, reason: 'bar', subscription: 'foobar'};
        var expected = {dc: 'foo', expire: 900, reason: 'bar', subscription: 'foobar'};
        Silenced.addEntry(entry);
        expect(Silenced.post).toHaveBeenCalledWith(expected);
      }));

      it('sets expire_on_resolve attribute', inject(function (Silenced) {
        spyOn(Silenced, 'post').and.callThrough();

        var entry = {datacenter: 'foo', expire: 'resolve', reason: 'bar'};
        var expected = {dc: 'foo', expire_on_resolve: true, reason: 'bar'};
        Silenced.addEntry(entry);
        expect(Silenced.post).toHaveBeenCalledWith(expected);
      }));
    });

    describe('clearEntries', function() {
      it('delete multiple silence entries', inject(function (Silenced) {
        spyOn(Silenced, 'delete').and.callThrough();

        var entries = [
          {_id: 'us-east-1:client:foo:bar', selected: true},
          {_id: 'us-east-1:client:baz:qux', selected: true},
          {_id: 'us-east-1:client:foo:baz', selected: false},
        ];
        Silenced.clearEntries(entries);

        expect(Silenced.delete).toHaveBeenCalledWith('us-east-1:client:foo:bar');
        expect(Silenced.delete).toHaveBeenCalledWith('us-east-1:client:baz:qux');
      }));
    });

    describe('delete', function() {
      it('sends a POST request to the silenced/clear endpoint', inject(function (Silenced) {
        $httpBackend.expectPOST('silenced/clear',
        '{"dc":"us-east-1","id":"client:foo:bar"}')
        .respond(200, '');

        Silenced.delete('us-east-1:client:foo:bar');
        $httpBackend.flush();
      }));
    });

    describe('deleteMultiple', function() {
      it('removes multiple silenced entries', inject(function(Silenced) {
        $httpBackend.expectPOST('silenced/clear', '{"dc":"foo","id":"bar"}')
        .respond(200, '');
        $httpBackend.expectPOST('silenced/clear', '{"dc":"baz","id":"qux"}')
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
        $httpBackend.expectPOST('silenced/clear', '{"dc":"foo","id":"bar"}')
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
        $httpBackend.expectPOST('silenced/clear', '{"dc":"foo","id":"bar"}')
        .respond(200, '');
        $httpBackend.expectPOST('silenced/clear', '{"dc":"baz","id":"qux"}')
        .respond(500, '');

        var filtered = [{_id: 'foo:bar'}, {_id: 'baz:qux'}];
        var selected = {ids: {'foo:bar': true, 'baz:qux': true}};

        Silenced.deleteMultiple(filtered, selected);

        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });

    describe('deleteSingle', function() {
      it('sends a POST request to the silenced/clear endpoint', inject(function (Silenced) {
        $httpBackend.expectPOST('silenced/clear', '{"dc":"us-east-1","id":"client:foo:bar"}')
        .respond(200, '');

        Silenced.deleteSingle('us-east-1:client:foo:bar');
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error', inject(function (Silenced) {
        $httpBackend.expectPOST('silenced/clear', '{"dc":"us-east-1","id":"client:bar:*"}')
        .respond(500, '');

        Silenced.deleteSingle('us-east-1:client:bar:*');
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

    describe('itemType', function() {
      it('returns "check" when providing a check object', inject(function (Silenced) {
        var objects = [{command: 'foo', name: 'bar'}];
        expect(Silenced.itemType(objects)).toEqual('check');
      }));

      it('returns "client" when providing a client object', inject(function (Silenced) {
        var objects = [{name: 'foo', version: '0.0.1'}];
        expect(Silenced.itemType(objects)).toEqual('client');
      }));

      it('returns "event" when providing an event object', inject(function (Silenced) {
        var objects = [{action: 'create', check: {name: 'foo'}, client: {name: 'bar'}}];
        expect(Silenced.itemType(objects)).toEqual('event');
      }));

      it('returns "event" when providing a check from the client view', inject(function (Silenced) {
        var objects = [{check: "foo", client: "bar", history: [0]}];
        expect(Silenced.itemType(objects)).toEqual('event');
      }));
    });

    describe('post', function() {
      it('sends a POST request to the silenced endpoint', inject(function (Silenced) {
        $httpBackend.expectPOST('silenced',
        '{"foo":"bar"}')
        .respond(200, '');

        Silenced.post({foo: 'bar'});
        $httpBackend.flush();
      }));
    });

    describe('query', function() {
      it('sends a GET request to the silenced endpoint', inject(function (Silenced) {
        $httpBackend.expectGET('silenced').respond(200, '["foo","bar"]');

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
    describe('create', function() {
      it('sends a POST request to the stashes endpoint', inject(function(Stashes) {
        $httpBackend.expectPOST('stashes',
        '{"foo":"bar"}')
        .respond(200, '');

        Stashes.create({foo: 'bar'});
        $httpBackend.flush();
      }));
    });
    describe('deleteMultiple', function() {
      it('removes multiple stashes', inject(function(Stashes) {
        $httpBackend.expectDELETE('stashes/foo%2Fbar?dc=us-east-1').respond(200, '');
        $httpBackend.expectDELETE('stashes/baz%2Fqux?dc=us-west-1').respond(200, '');

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
        $httpBackend.expectDELETE('stashes/foo%2Fbar?dc=us-east-1').respond(200, '');

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
        $httpBackend.expectDELETE('stashes/foo%2Fbar?dc=us-east-1').respond(200, '');
        $httpBackend.expectDELETE('stashes/baz%2Fqux?dc=us-west-1').respond(500, '');

        var filtered = [{_id: 'us-east-1/foo/bar'}, {_id: 'us-west-1/baz/qux'}];
        var selected = {ids: {'us-east-1/foo/bar': true, 'us-west-1/baz/qux': true}};

        Stashes.deleteMultiple(filtered, selected)

        $httpBackend.flush();
        expect(mockNotification.error).toHaveBeenCalled();
      }));
    });

    describe('deleteSingle', function() {
      it('sends a POST request to the silenced/clear endpoint', inject(function (Stashes) {
        $httpBackend.expectDELETE('stashes/foo%2Fbar?dc=us-east-1').respond(200, '');

        Stashes.deleteSingle('us-east-1/foo/bar');
        $httpBackend.flush();
        expect(mockNotification.success).toHaveBeenCalled();
      }));

      it('handles an error', inject(function (Stashes) {
        $httpBackend.expectDELETE('stashes/foo%2Fbar?dc=us-east-1').respond(500, '');

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
      it('sends a GET request to the subscriptions endpoint', inject(function (Subscriptions) {
        $httpBackend.expectGET('subscriptions').respond(200, '["foo","bar"]');

        Subscriptions.query({foo: 'bar'}).$promise.then(
          function(results){
            expect(results.length).toEqual(2);
          }
        );
        $httpBackend.flush();
      }));
    });
  });

  describe('UserConfig', function () {
    describe('get', function() {
      it('returns the cookie value', inject(function (UserConfig) {
        expect(UserConfig.get('foobar')).toEqual('foo');
      }));

      it('returns a default value', inject(function (UserConfig) {
        expect(UserConfig.get('')).toEqual(false);
      }));
    });
  });
});
