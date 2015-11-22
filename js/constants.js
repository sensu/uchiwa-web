var constantModule = angular.module('uchiwa.constants', []);

constantModule.value('conf', {
  appName: 'Uchiwa',
  date: 'YYYY-MM-DD HH:mm:ss',
  enterprise: false,
  hideSilenced: false,
  hideClientsSilenced: false,
  hideOccurrences: false,
  refresh: 10000,
  theme: 'uchiwa-default'
});

constantModule.value('themes', [
  {
    name: 'uchiwa-default'
  },
  {
    name: 'uchiwa-dark'
  }
]);

// Version
constantModule.constant('version', {
  uchiwa: '0.13.0'
});
