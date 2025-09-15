// path: electron/main.ts
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { registerBoxesIpc } from './ipc/handlers/boxes';
import { registerTemplateIpc } from './ipc/handlers/templates';
import { registerChequesIpc } from './ipc/handlers/cheques';
import { registerPrintIpc } from './ipc/handlers/print';

const isDev = !app.isPackaged;

/** Swallow EPIPE from nodemon/concurrently restarts in dev */
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process.stdout as any).on?.('error', (err: any) => {
    if (err && err.code === 'EPIPE') return;
    throw err;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process.stderr as any).on?.('error', (err: any) => {
    if (err && err.code === 'EPIPE') return;
    throw err;
  });
} catch {
  /* noop */
}

/** In dev, make the Vite origin explicit so print helpers can use it */
if (isDev && !process.env.VITE_DEV_SERVER_URL) {
  process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // show after ready-to-show to avoid flashes
    webPreferences: {
      preload: isDev
        ? path.join(process.cwd(), 'dist-electron', 'preload.cjs')
        : path.join(process.resourcesPath, 'dist-electron', 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const url = isDev
    ? (process.env.VITE_DEV_SERVER_URL as string)
    : `file://${path.join(process.resourcesPath, 'dist', 'index.html')}`;

  console.log('[main] isDev:', isDev, '→ loading:', url);

  // Load and show when ready for a cleaner UX
  win.loadURL(url).catch((e) => console.error('[main] loadURL error:', e));
  win.once('ready-to-show', () => win.show());

  if (isDev) win.webContents.openDevTools({ mode: 'detach' });

  // Optional: basic crash logging
  win.webContents.on('render-process-gone', (_e, details) => {
    console.error('[main] renderer gone:', details);
  });

  return win;
}

// Single-instance guard (prevents two DB writers)
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    registerTemplateIpc();
    registerBoxesIpc();
    registerChequesIpc();
    registerPrintIpc();

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
