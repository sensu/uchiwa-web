'use strict';

describe('common', function () {
  var $rootScope;
  var $scope;
  var mockConfig;
  var mockToastr;

  beforeEach(module('uchiwa'));

  beforeEach(function() {
    mockConfig = jasmine.createSpyObj('mockConfig', ['favicon']);
    mockToastr = jasmine.createSpyObj('mockToastr', ['error', 'success']);
    module(function($provide) {
      $provide.value('Config', mockConfig);
      $provide.value('toastr', mockToastr);
    });
  });

  beforeEach(inject(function (_$rootScope_) {
    $rootScope = _$rootScope_;
    $scope = $rootScope.$new();
  }));

  describe('Helpers', function () {
    describe('findIdInItems', function() {
      it('returns a specified item in an array of items', inject(function (Helpers) {
        var items = [{_id: 'foo:bar'}, {_id: 'baz/qux'}];
        var item = Helpers.findIdInItems('foo:bar', items);
        expect(item).toEqual(items[0]);
      }));

      it('handles an error with the array', inject(function (Helpers) {
        var item = Helpers.findIdInItems('foo:bar');
        expect(item).toEqual(null);

        var item = Helpers.findIdInItems('foo:bar', 'foo');
        expect(item).toEqual(null);
      }));

      it('handles a missing item', inject(function (Helpers) {
        var items = [{_id: 'foo:bar'}, {_id: 'baz/qux'}];
        var item = Helpers.findIdInItems('foo:qux', items);
        expect(item).toEqual(null);
      }));
    });

    describe('getSelected', function() {
      it('sets the selected.all attribute to false', inject(function (Helpers) {
        var filtered = [{_id: 'us-east-1:foo'}, {_id: 'us-east-1:bar'}];
        var selected = {all: true, ids: {'us-east-1:foo': true, 'us-east-1:bar': true}};
        var items = Helpers.getSelected(filtered, selected);
        expect(selected.all).toBeFalse;
        expect(items.length).toEqual(2);
      }));

      it('only returns the selected items', inject(function (Helpers) {
        var filtered = [{_id: 'us-east-1:foo'}, {_id: 'us-east-1:bar'}];
        var selected = {all: false, ids: {'us-east-1:foo': true}};
        var items = Helpers.getSelected(filtered, selected);
        expect(items).toEqual([filtered[0]]);
      }));

      it('handles items with similar names', inject(function (Helpers) {
        var filtered = [{_id: 'us-east-1:foo2'}, {_id: 'us-east-1:foo'}, {_id: 'us-east-1:foo1'},];
        var selected = {all: false, ids: {'us-east-1:foo': true, 'us-east-1:foo2': true}};
        var items = Helpers.getSelected(filtered, selected);
        expect(items).toEqual([filtered[1], filtered[0]]);
      }));
    });

    describe('equals', function () {
      it('returns true when the expected variable is an empty string', inject(function (Helpers) {
        expect(Helpers.equals('foo', '')).toEqual(true);
      }));

      it('returns true when the actual & expected variable are strictly similar', inject(function (Helpers) {
        expect(Helpers.equals('foo', 'foo')).toEqual(true);
      }));

      it('returns false when the actual & expected variable are not strictly similar', inject(function (Helpers) {
        expect(Helpers.equals('foo', 'foobar')).toEqual(false);
      }));
    });

    describe('escapeDot', function () {
      it('returns the same value if empty', inject(function (Helpers) {
        expect(Helpers.escapeDot('')).toEqual('');
      }));

      it('leaves untouch a valid value', inject(function (Helpers) {
        expect(Helpers.escapeDot('foo')).toEqual('foo');
      }));

      it('escapes a value with a dot notation', inject(function (Helpers) {
        expect(Helpers.escapeDot('.foo')).toEqual('\\.foo');
      }));
    });

    describe('hasElementSelected', function () {
      it('returns false when no elements are selected', inject(function (Helpers) {
        expect(Helpers.hasElementSelected({})).toEqual(false);
        expect(Helpers.hasElementSelected({ids: {foo: false}})).toEqual(false);
      }));

      it('returns true when one element is selected', inject(function (Helpers) {
        expect(Helpers.hasElementSelected({ids: {foo: true}})).toEqual(true);
        expect(Helpers.hasElementSelected({ids: {foo: false, bar: true}})).toEqual(true);
      }));
    });

    describe('isUrl', function () {
      it('returns false when the value is not a URL', inject(function (Helpers) {
        expect(Helpers.isUrl('')).toEqual(false);
        expect(Helpers.isUrl('foobar')).toEqual(false);
      }));

      it('returns true when the value is a URL with target="_blank"', inject(function (Helpers) {
        expect(Helpers.isUrl('<a target="_blank" href="http://example.org">http://example.org</a>')).toEqual(true);
      }));
    });

    describe('secondsBetweenDates', function () {
      it('returns "unknown" if at least one of the date is undefined', inject(function(Helpers){
        expect(Helpers.secondsBetweenDates()).toEqual('unknown');
      }));

      it('returns the seconds between two unix timestamps (milliseconds)', inject(function(Helpers){
        expect(Helpers.secondsBetweenDates(1474149594000, 1474153194000)).toEqual(3600);
      }));

      it('returns the seconds between two human dates', inject(function(Helpers){
        expect(Helpers.secondsBetweenDates('2016-09-17 18:45:20', '2016-09-17 19:00:20')).toEqual(900);
      }));
    });

    describe('selectAll', function () {
      it('marks all filtered items as selected', inject(function (Helpers) {
        var filtered = [{_id: 'foo'}, {_id: 'bar'}];
        var selected = {all: true, ids: {foo: true}};
        var expectedSelected = {foo: true, bar: true};
        Helpers.selectAll(filtered, selected);
        expect(selected.ids).toEqual(expectedSelected);
      }));

      it('marks all filtered items as unselected', inject(function (Helpers) {
        var filtered = [{_id: 'foo'}, {_id: 'bar'}];
        var selected = {all: false, ids: {foo: true}};
        var expectedSelected = {foo: false, bar: false};
        Helpers.selectAll(filtered, selected);
        expect(selected.ids).toEqual(expectedSelected);
      }));
    });

    describe('updateSelected', function () {
      it('does not remove any items when a filter is removed', inject(function (Helpers) {
        var newValues = ['', false, ''];
        var oldValues = ['', false, 'baz'];
        var filtered = [{_id: 'foo'}];
        var selected = {ids: {foo: true, bar: true}}
        var expectedSelected = {ids: {foo: true, bar: true}}
        Helpers.updateSelected(newValues, oldValues, filtered, selected);
        expect(selected).toEqual(expectedSelected);
      }));
      it('removes any selected items that are filtered', inject(function (Helpers) {
        var newValues = ['', false, 'baz'];
        var oldValues = ['', false, ''];
        var filtered = [{_id: 'foo'}];
        var selected = {ids: {foo: true, bar: true}}
        var expectedSelected = {ids: {foo: true, bar: false}}
        Helpers.updateSelected(newValues, oldValues, filtered, selected);
        expect(selected).toEqual(expectedSelected);
      }));
    });
  });

  describe('Notification', function () {
    describe('error', function() {
      it('creates an error notification', inject(function (Notification) {
        Notification.error('foo');
        expect(mockToastr.error).toHaveBeenCalled();
      }));
    });

    describe('success', function() {
      it('creates a success notification', inject(function (Notification) {
        Notification.success('foo');
        expect(mockToastr.success).toHaveBeenCalled();
      }));
    });
  });
});
