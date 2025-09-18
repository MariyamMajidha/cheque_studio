import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

/** Find built index.html (fallback for normal app pages) */
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

/** Find built preview.html for dedicated print page */
function findBuiltPreview(): string {
  const appPath = app.getAppPath();
  const resPath = process.resourcesPath ?? '';
  const candidates = [
    path.join(appPath, 'dist', 'preview.html'),
    path.join(resPath, 'dist', 'preview.html'),
    path.join(process.cwd(), 'dist', 'preview.html')
  ];
  const hit = candidates.find((p) => p && fs.existsSync(p));
  if (!hit) {
    throw new Error(
      `[getAppUrl] Could not locate preview.html.\nChecked:\n${candidates.join('\n')}`
    );
  }
  return hit;
}

/**
 * Returns a URL for the renderer. If the path starts with "/print/preview"
 * we load the dedicated /preview.html; otherwise we route to index.html#hash.
 */
export function getAppUrl(hashPath: string): string {
  const dev = process.env.VITE_DEV_SERVER_URL?.replace(/\/$/, '');

  // --- Dedicated print preview: /preview.html?...
  if (hashPath.startsWith('/print/preview')) {
    const qIndex = hashPath.indexOf('?');
    const qs = qIndex >= 0 ? hashPath.slice(qIndex) : '';
    if (dev) {
      // In dev, Vite serves public/preview.html directly
      return `${dev}/preview.html${qs}`;
    }
    const previewFile = findBuiltPreview();
    return `file://${previewFile}${qs}`;
  }

  // --- Normal app pages via index.html#...
  if (dev) {
    return `${dev}#${hashPath}`;
  }

  // If the main window is http in dev-like states, reuse its origin
  const main = BrowserWindow.getAllWindows()[0];
  const current = main?.webContents.getURL();
  if (current && current.startsWith('http')) {
    const origin = current.split('#')[0];
    return `${origin}#${hashPath}`;
  }

  const indexFile = findBuiltIndex();
  return `file://${indexFile}#${hashPath}`;
}
