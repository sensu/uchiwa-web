var conf;

describe("constants", function () {
  beforeEach(module('uchiwa.constants'));

  beforeEach( inject(function (_conf_) {
    conf = _conf_;
  }));

  describe("conf", function () {
    it("should provide a value conf", function () {
      console.log(conf)
      expect(angular.isObject(conf)).toBeTruthy();
    });

    it("should provide a theme setting with a value of 'uchiwa-default'", function () {
      var expected = 'uchiwa-default';

      expect(conf.theme).toEqual(expected);
    });
  });
});
