// path: electron/printing/print.ts
import { BrowserWindow, WebContents } from 'electron';
import path from 'node:path';
import { getAppUrl } from './url';

/**
 * Build the preview route URL.
 */
export function buildPreviewUrl(templateId: number, chequeIds: number[], ox = 0, oy = 0): string {
  const ids = chequeIds.filter((n) => Number.isFinite(n) && n > 0);
  return getAppUrl(
    `/print/preview?templateId=${templateId}&chequeIds=${ids.join(',')}&ox=${ox}&oy=${oy}`
  );
}

/**
 * Create a BrowserWindow suitable for print/preview tasks.
 */
export function createPrintWindow(show = false): BrowserWindow {
  return new BrowserWindow({
    width: 980,
    height: 740,
    show,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(process.cwd(), 'dist-electron', 'preload.cjs')
    }
  });
}

/**
 * Load a (hidden) BrowserWindow and render it to PDF.
 */
export async function renderPreviewPDF(opts: {
  templateId: number;
  chequeIds: number[];
  ox?: number;
  oy?: number;
}): Promise<Buffer> {
  const win = createPrintWindow(false);

  try {
    const url = buildPreviewUrl(opts.templateId, opts.chequeIds, opts.ox ?? 0, opts.oy ?? 0);
    console.log('[renderPreviewPDF] loadURL =>', url);
    await win.loadURL(url);

    // Give React/Canvas a moment to paint
    await new Promise((r) => setTimeout(r, 120));

    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4'
    });

    return pdf;
  } finally {
    if (!win.isDestroyed()) win.close();
  }
}

/**
 * Fire an OS print for the given WebContents.
 */
export async function runPrint(
  contents: WebContents,
  printerName: string | undefined,
  silent: boolean,
  copies: number
): Promise<void> {
  const options: Electron.WebContentsPrintOptions = {
    silent,
    printBackground: true,
    copies: Math.max(1, copies || 1)
  };

  if (printerName && printerName.trim()) {
    options.deviceName = printerName.trim();
  }

  await new Promise<void>((resolve, reject) => {
    contents.print(options, (success, failureReason) => {
      if (success) return resolve();
      reject(new Error(failureReason || 'Print failed'));
    });
  });
}
