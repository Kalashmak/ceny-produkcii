'use strict';
// Мост между интерфейсом и приложением: только то, что нужно программе, без доступа к диску напрямую.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  // данные, загруженные при первом запуске (строка JSON или null)
  seeds: () => ipcRenderer.sendSync('seeds:get'),
  findData: () => ipcRenderer.invoke('data:find'),
  importData: p => ipcRenderer.invoke('data:import', p || null),
  autoBackup: json => ipcRenderer.invoke('backup:auto', json),
  saveBackupAs: (json, name) => ipcRenderer.invoke('backup:saveAs', json, name),
  openBackups: () => ipcRenderer.invoke('backup:open'),
  listBackups: () => ipcRenderer.invoke('backup:list'),
  info: () => ipcRenderer.invoke('app:info'),
  updateState: () => ipcRenderer.invoke('update:state'),
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdate: cb => ipcRenderer.on('update:state', (e, s) => cb(s)),
});
