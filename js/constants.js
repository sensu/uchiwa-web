var constantModule = angular.module('uchiwa.constants', []);

constantModule.value('THEMES', [
  {name: 'uchiwa-default'},
  {name: 'uchiwa-dark'}
]);

// Version
constantModule.value('VERSION', {
  uchiwa: '0.22.0'
});
