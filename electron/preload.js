const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  appVersion: process.env.npm_package_version || '1.0.0',
  isDesktop: true,
});
