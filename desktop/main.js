'use strict';
// Цены на продукцию — настольное приложение.
// Окно показывает интерфейс из app/index.html. Данные (оклады, цены, калькуляции) в установщике нет:
// при первом запуске они загружаются из файла и хранятся в папке приложения на этом компьютере.
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
let win = null;
// для проверок: отдельная папка данных, чтобы не трогать рабочую
if (process.env.CENY_USERDATA) app.setPath('userData', process.env.CENY_USERDATA);
if (process.env.CENY_DOCS) app.setPath('documents', process.env.CENY_DOCS);

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

const SEEDS = () => path.join(app.getPath('userData'), 'seeds.json');
const BACKUP_DIR = () => path.join(app.getPath('documents'), 'Цены на продукцию', 'Резервные копии');
// Где на этом компьютере может лежать файл данных, собранный из Excel
const DATA_CANDIDATES = () => [
  path.join(app.getPath('documents'), 'ceny-produkcii-dannye', 'Данные для программы.json'),
  path.join(app.getPath('desktop'), 'Сдельные расценки', 'Данные для программы.json'),
];

// Файл данных: копия программы {kind:'ceny-produkcii-backup', data:{c1,c2,price}}
function validData(d) {
  if (!d || d.kind !== 'ceny-produkcii-backup' || !d.data) return 'Это не файл данных программы «Цены на продукцию».';
  const { c1, c2, price } = d.data;
  const rates = x => x && Array.isArray(x.groups) && Array.isArray(x.ops) && x.settings;
  if (!rates(c1)) return 'В файле нет расценок цеха 1.';
  if (!rates(c2)) return 'В файле нет расценок цеха 2.';
  if (!(price && Array.isArray(price.prods) && price.mats)) return 'В файле нет цен на продукцию.';
  return null;
}
function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 900, minHeight: 600, show: false,
    title: 'Цены на продукцию', backgroundColor: '#f3f5f9',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  // ссылки наружу (GitHub и т.п.) — в обычном браузере, не в окне программы
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); } });
  // F5 — перезагрузка, F12 — инструменты разработчика (для разбора проблем)
  win.webContents.on('before-input-event', (e, inp) => {
    if (inp.type !== 'keyDown') return;
    if (inp.key === 'F5') { win.webContents.reload(); e.preventDefault(); }
    if (inp.key === 'F12') { win.webContents.toggleDevTools(); e.preventDefault(); }
  });
}

/* ---------- данные ---------- */
ipcMain.on('seeds:get', e => {
  try { e.returnValue = fs.existsSync(SEEDS()) ? fs.readFileSync(SEEDS(), 'utf8') : null; } catch (err) { e.returnValue = null; }
});
ipcMain.handle('data:find', () => DATA_CANDIDATES().find(p => fs.existsSync(p)) || null);
ipcMain.handle('data:import', async (e, givenPath) => {
  let p = givenPath;
  if (!p) {
    const r = await dialog.showOpenDialog(win, { title: 'Файл данных программы', filters: [{ name: 'Данные (.json)', extensions: ['json'] }], properties: ['openFile'] });
    if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
    p = r.filePaths[0];
  }
  let d; try { d = readJson(p); } catch (err) { return { ok: false, error: 'Файл не читается: ' + err.message }; }
  const bad = validData(d); if (bad) return { ok: false, error: bad };
  fs.mkdirSync(path.dirname(SEEDS()), { recursive: true });
  fs.writeFileSync(SEEDS(), JSON.stringify(d.data));
  return { ok: true, saved: d.saved || null };
});

/* ---------- копии ---------- */
// Автокопия: одна на день, хранится 60 последних — защита от очистки и ошибочных правок
ipcMain.handle('backup:auto', (e, json) => {
  const dir = BACKUP_DIR(); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `копия-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(file, json);
  const all = fs.readdirSync(dir).filter(f => /^копия-\d{4}-\d\d-\d\d\.json$/.test(f)).sort();
  for (const f of all.slice(0, Math.max(0, all.length - 60))) fs.unlinkSync(path.join(dir, f));
  return { ok: true, file };
});
ipcMain.handle('backup:saveAs', async (e, json, name) => {
  const r = await dialog.showSaveDialog(win, { title: 'Сохранить копию данных', defaultPath: path.join(app.getPath('documents'), name), filters: [{ name: 'Копия (.json)', extensions: ['json'] }] });
  if (r.canceled || !r.filePath) return { ok: false };
  fs.writeFileSync(r.filePath, json); return { ok: true, file: r.filePath };
});
ipcMain.handle('backup:open', () => { const d = BACKUP_DIR(); fs.mkdirSync(d, { recursive: true }); shell.openPath(d); });
ipcMain.handle('backup:list', () => { const d = BACKUP_DIR(); if (!fs.existsSync(d)) return []; return fs.readdirSync(d).filter(f => f.endsWith('.json')).sort().reverse().slice(0, 10); });

/* ---------- обновления приложения (установщик с GitHub Releases) ---------- */
// Код интерфейса обновляется отдельно и чаще — через GitHub Pages (app.js). Здесь — сама программа целиком.
let upd = { state: 'idle', version: null, error: null };
function sendUpd() { if (win && !win.isDestroyed()) win.webContents.send('update:state', upd); }
function setupUpdater() {
  if (isDev) { upd = { state: 'dev' }; return; }
  let autoUpdater;
  try { ({ autoUpdater } = require('electron-updater')); } catch (e) { upd = { state: 'error', error: 'нет модуля обновлений' }; return; }
  autoUpdater.autoDownload = true; autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => { upd = { state: 'checking' }; sendUpd(); });
  autoUpdater.on('update-not-available', () => { upd = { state: 'latest' }; sendUpd(); });
  autoUpdater.on('update-available', i => { upd = { state: 'downloading', version: i.version }; sendUpd(); });
  autoUpdater.on('download-progress', p => { upd = { ...upd, state: 'downloading', percent: Math.round(p.percent) }; sendUpd(); });
  autoUpdater.on('update-downloaded', i => { upd = { state: 'ready', version: i.version }; sendUpd(); });
  autoUpdater.on('error', err => { upd = { state: 'error', error: String(err && err.message || err).slice(0, 200) }; sendUpd(); });
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  setTimeout(check, 8000); setInterval(check, 6 * 3600e3);
  ipcMain.handle('update:check', () => check());
  ipcMain.handle('update:install', () => autoUpdater.quitAndInstall(false, true));
}
ipcMain.handle('update:state', () => upd);
ipcMain.handle('app:info', () => ({ version: app.getVersion(), userData: app.getPath('userData'), backups: BACKUP_DIR() }));

app.whenReady().then(() => { createWindow(); setupUpdater(); });
app.on('window-all-closed', () => app.quit());
