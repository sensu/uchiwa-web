var constantModule = angular.module('uchiwa.constants', []);

constantModule.value('THEMES', [
  {name: 'uchiwa-default'},
  {name: 'uchiwa-dark'}
]);

// Version
constantModule.constant('VERSION', {
  uchiwa: '0.19.0'
});
