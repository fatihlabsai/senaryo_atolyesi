// Arayüze yalnızca güvenli işlevler açılır: sürüm bilgisi, https bağlantısını dış tarayıcıda açma
// ve uygulama içi güncelleme (indirme ve kurulum ilerlemesi).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('senaryoDesktop', {
  getVersion: () => ipcRenderer.invoke('app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  installUpdate: (info) => ipcRenderer.invoke('update-install', info),
  onUpdateProgress: (cb) => ipcRenderer.on('update-progress', (_e, d) => cb(d))
});
