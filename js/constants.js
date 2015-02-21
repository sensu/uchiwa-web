var constantModule = angular.module('uchiwa.constants', []);

constantModule.value('conf', {
  date: 'YYYY-MM-DD HH:mm:ss',
  enterprise: false,
  hideSilenced: false,
  hideClientSilenced: false,
  hideOccurrences: false,
  refresh: 10000,
  theme: 'uchiwa-default'
});

// Version
constantModule.constant('version', {
  uchiwa: '0.5.1'
});
