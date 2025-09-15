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

/**
 * Build an app URL for a hash route.
 * Order:
 * 1) VITE_DEV_SERVER_URL env
 * 2) Any open BrowserWindow with an http(s) URL (not just the first)
 * 3) file:// path to built index.html
 */
export function getAppUrl(hashPath: string): string {
  const dev = process.env.VITE_DEV_SERVER_URL;
  if (dev) return `${dev}#${hashPath}`;

  // Look through ALL windows — the first can be about:blank (the preview)
  const wins = BrowserWindow.getAllWindows();
  for (const w of wins) {
    const current = w.webContents.getURL();
    if (current && current.startsWith('http')) {
      const origin = current.split('#')[0];
      return `${origin}#${hashPath}`;
    }
  }

  const indexFile = findBuiltIndex();
  return `file://${indexFile}#${hashPath}`;
}

export function buildPreviewUrl(templateId: number, chequeIds: number[], ox = 0, oy = 0) {
  const ids = chequeIds.filter((n) => Number.isFinite(n) && n > 0);
  return getAppUrl(
    `/print/preview?templateId=${templateId}&chequeIds=${ids.join(',')}&ox=${ox}&oy=${oy}`
  );
}
