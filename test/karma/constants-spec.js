describe("constants", function () {
  beforeEach(module('uchiwa'));

  var settings;

  describe("conf", function () {
    beforeEach(inject(function ($controller, _$rootScope_, _conf_) {
      conf = _conf_;
    }));

    it("should provide a value conf", function () {
      expect(angular.isObject(conf)).toBeTruthy();
    });

    it("should provide a theme setting with a value of 'uchiwa-default'", function () {
      var expected = 'uchiwa-default';

      expect(conf.theme).toEqual(expected);
    });
  });
});
