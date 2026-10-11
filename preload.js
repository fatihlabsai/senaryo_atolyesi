// Arayüze yalnızca iki güvenli işlev açılır: sürüm bilgisi ve https bağlantısını dış tarayıcıda açma.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('senaryoDesktop', {
  getVersion: () => ipcRenderer.invoke('app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
