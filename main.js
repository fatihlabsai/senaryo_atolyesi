const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 640,
    title: 'Senaryo Atölyesi',
    backgroundColor: '#f1eee7',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
}

ipcMain.handle('app-version', () => app.getVersion());
ipcMain.handle('open-external', (_event, url) => {
  // Yalnızca https bağlantıları dış tarayıcıda açılır.
  if (typeof url === 'string' && url.startsWith('https://')) return shell.openExternal(url);
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
