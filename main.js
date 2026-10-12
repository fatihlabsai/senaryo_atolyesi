const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const { spawn } = require('child_process');

const REPO = 'fatihlabsai/senaryo_atolyesi';
const OK_HOSTS = ['github.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com'];

function allowedUrl(u) {
  try {
    const x = new URL(u);
    if (x.protocol !== 'https:' || !OK_HOSTS.includes(x.hostname)) return false;
    // Ana adres yalnızca bu deponun dosyalarını gösterebilir; yönlendirmeler (imzalı) host ile sınırlanır.
    return x.hostname !== 'github.com' || x.pathname.startsWith('/' + REPO + '/');
  } catch (e) { return false; }
}

// Dosyayı indirir, SHA-256 özetini aynı anda hesaplar, ilerlemeyi bildirir.
function download(url, dest, onProgress, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (!allowedUrl(url)) return reject(new Error('Güncelleme bağlantısı güvenli değil.'));
    https.get(url, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        if (redirects > 5) return reject(new Error('Çok fazla yönlendirme.'));
        return resolve(download(new URL(res.headers.location, url).toString(), dest, onProgress, redirects + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('İndirme başarısız (' + res.statusCode + ').')); }
      const total = Number(res.headers['content-length']) || 0;
      const hash = crypto.createHash('sha256');
      let got = 0;
      const file = fs.createWriteStream(dest);
      res.on('data', chunk => { got += chunk.length; hash.update(chunk); onProgress(got, total); });
      res.on('error', reject);
      file.on('error', reject);
      file.on('finish', () => file.close(() => resolve(hash.digest('hex'))));
      res.pipe(file);
    }).on('error', reject);
  });
}

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

// Uygulama içi güncelleme: indir, doğrula, sessiz kur, uygulamayı yeniden aç.
// Kullanıcı verileri uygulama klasöründe (userData) durur; kurulum bunlara dokunmaz.
ipcMain.handle('update-install', async (event, info) => {
  const send = d => { if (!event.sender.isDestroyed()) event.sender.send('update-progress', d); };
  const ver = info && String(info.version || '');
  const url = info && String(info.url || '');
  if (!/^\d+\.\d+\.\d+$/.test(ver) || !allowedUrl(url)) {
    const error = 'Güncelleme bilgisi geçersiz.';
    send({state: 'error', error});
    return {ok: false, error};
  }
  const isWin = process.platform === 'win32';
  const dest = path.join(app.getPath('temp'), 'senaryo-atolyesi-' + ver + (isWin ? '-setup.exe' : '.dmg'));
  send({state: 'downloading', received: 0, total: 0, version: ver});
  try {
    const digest = await download(url, dest, (received, total) => send({state: 'downloading', received, total, version: ver}));
    if (info.sha256 && String(info.sha256).toLowerCase() !== digest) {
      fs.unlink(dest, () => {});
      throw new Error('Dosya doğrulanamadı. Güncelleme iptal edildi, tekrar dene.');
    }
    if (isWin) {
      send({state: 'installing', version: ver});
      // Kurulumu uygulama tamamen kapandıktan sonra başlat; kurucu sessiz modda çalışır ve uygulamayı yeniden açar.
      app.once('quit', () => {
        spawn(dest, ['/S', '--force-run'], {detached: true, stdio: 'ignore'}).unref();
      });
      setTimeout(() => app.quit(), 600);
    } else {
      // macOS'ta sessiz kurulum yok: dmg açılır, kullanıcı uygulamayı sürükler.
      const err = await shell.openPath(dest);
      if (err) throw new Error(err);
      send({state: 'opened', version: ver});
    }
    return {ok: true};
  } catch (e) {
    send({state: 'error', error: e.message || 'Güncelleme başarısız.'});
    return {ok: false, error: e.message};
  }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
