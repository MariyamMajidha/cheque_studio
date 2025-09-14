// path: electron/main.ts  (add one import + call)

import { app, BrowserWindow, Menu, shell } from 'electron';
import path from 'node:path';
import { registerBoxesIpc } from './ipc/handlers/boxes';
import { registerTemplateIpc } from './ipc/handlers/templates';
import { registerChequesIpc } from './ipc/handlers/cheques';
import { registerPrintIpc } from './ipc/handlers/print';

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: isDev
        ? path.join(process.cwd(), 'dist-electron', 'preload.cjs')
        : path.join(process.resourcesPath, 'dist-electron', 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const url = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(process.resourcesPath, 'dist', 'index.html')}`;

  console.log('[main] isDev:', isDev, '→ loading:', url);
  win.loadURL(url);
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
}

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
