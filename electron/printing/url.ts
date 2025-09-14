// path: electron/printing/url.ts
import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

function findBuiltIndex(): string {
  const appPath = app.getAppPath();
  const resPath = process.resourcesPath ?? '';
  const candidates = [
    path.join(appPath, 'dist', 'renderer', 'index.html'),
    path.join(resPath, 'dist', 'renderer', 'index.html'),
    path.join(appPath, 'dist', 'index.html'),
    path.join(resPath, 'dist', 'index.html'),
    path.join(process.cwd(), 'dist', 'renderer', 'index.html'),
    path.join(process.cwd(), 'dist', 'index.html')
  ];
  const hit = candidates.find((p) => p && fs.existsSync(p));
  if (!hit) {
    throw new Error(
      `[getAppUrl] Could not locate renderer index.html.\nChecked:\n${candidates.join('\n')}`
    );
  }
  return hit;
}

export function getAppUrl(hashPath: string): string {
  // 1) Dev: explicit env
  const dev = process.env.VITE_DEV_SERVER_URL;
  if (dev) {
    const u = `${dev}#${hashPath}`;
    console.log('[getAppUrl] using env:', u);
    return u;
  }

  // 2) Dev: sniff currently loaded main window (localhost:5173#/…)
  const main = BrowserWindow.getAllWindows()[0];
  const current = main?.webContents.getURL();
  if (current && current.startsWith('http')) {
    const origin = current.split('#')[0];
    const u = `${origin}#${hashPath}`;
    console.log('[getAppUrl] sniffed origin:', u);
    return u;
  }

  // 3) Prod: fallback to built file
  const indexFile = findBuiltIndex();
  const u = `file://${indexFile}#${hashPath}`;
  console.log('[getAppUrl] fallback file:', u);
  return u;
}
