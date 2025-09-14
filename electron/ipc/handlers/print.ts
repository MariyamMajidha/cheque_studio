import { BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { getDb } from '../../db/connection';
import type { PrintPreviewArgs, PrintRunArgs } from '../types';
import { createPrintWindow, buildPreviewUrl } from '../../printing/print'; // 👈 import helpers

function getAppUrl(hashPath: string) {
  const dev = process.env.VITE_DEV_SERVER_URL;
  return dev
    ? `${dev}#${hashPath}`
    : `file://${path.join(process.cwd(), 'dist', 'index.html')}#${hashPath}`;
}

export function registerPrintIpc(): void {
  ipcMain.removeHandler('print:preview');
  ipcMain.removeHandler('print:run');

  // ---------- Preview ----------
  ipcMain.handle('print:preview', async (_evt, args: PrintPreviewArgs) => {
    const db = getDb();

    const template = db
      .prepare(
        `SELECT id, name, width_mm, height_mm, dpi, orientation, margin_mm, background_path
           FROM templates WHERE id = ?`
      )
      .get(args.templateId);
    if (!template) throw new Error('Template not found');

    const boxes = db
      .prepare(
        `SELECT id, template_id, label, mapped_field,
                x_mm, y_mm, w_mm, h_mm,
                font_family, font_size, bold, italic, align, uppercase,
                letter_spacing, line_height, color, rotation,
                locked, z_index, date_format, date_digit_index
           FROM template_boxes
          WHERE template_id = ?
          ORDER BY z_index ASC, id ASC`
      )
      .all(args.templateId);

    const ids = (args.chequeIds ?? []).filter((n) => Number.isFinite(n) && n > 0);
    const cheques = ids.length
      ? db
          .prepare(
            `SELECT id, template_id, date, payee, amount, amount_words
                 FROM cheques
                WHERE id IN (${ids.map(() => '?').join(',')})
                ORDER BY id ASC`
          )
          .all(...ids)
      : [];

    const templateWithBoxes = { ...template, _boxes: boxes };

    const previewWin = new BrowserWindow({
      width: 980,
      height: 740,
      show: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(process.cwd(), 'dist-electron', 'preload.cjs')
      }
    });

    const ox = args.offsets?.offset_x_mm ?? 0;
    const oy = args.offsets?.offset_y_mm ?? 0;
    const url = getAppUrl(
      `/print/preview?templateId=${args.templateId}&chequeIds=${ids.join(',')}&ox=${ox}&oy=${oy}`
    );

    await previewWin.loadURL(url);
    await new Promise((r) => previewWin.webContents.once('did-finish-load' as any, r));

    previewWin.webContents.send('print:payload', { template: templateWithBoxes, cheques });
  });

  // ---------- Print ----------
  // ---------- Print ----------
  ipcMain.handle('print:run', async (_evt, args: PrintRunArgs) => {
    const db = getDb();

    const template = db
      .prepare(
        `SELECT id, name, width_mm, height_mm, dpi, orientation, margin_mm, background_path
         FROM templates WHERE id = ?`
      )
      .get(args.templateId);
    if (!template) throw new Error('Template not found');

    const boxes = db
      .prepare(
        `SELECT id, template_id, label, mapped_field,
              x_mm, y_mm, w_mm, h_mm,
              font_family, font_size, bold, italic, align, uppercase,
              letter_spacing, line_height, color, rotation,
              locked, z_index, date_format, date_digit_index
         FROM template_boxes
        WHERE template_id = ?
        ORDER BY z_index ASC, id ASC`
      )
      .all(args.templateId);

    const ids = (args.chequeIds ?? []).filter((n) => Number.isFinite(n) && n > 0);
    const cheques = ids.length
      ? db
          .prepare(
            `SELECT id, template_id, date, payee, amount, amount_words
               FROM cheques
              WHERE id IN (${ids.map(() => '?').join(',')})
              ORDER BY id ASC`
          )
          .all(...ids)
      : [];

    const templateWithBoxes = { ...template, _boxes: boxes };

    // -----------------------------
    // Use new helpers here
    // -----------------------------
    const ox = args.offsets?.offset_x_mm ?? 0;
    const oy = args.offsets?.offset_y_mm ?? 0;

    const worker = createPrintWindow(!args.silent);
    const url = buildPreviewUrl(args.templateId, ids, ox, oy);

    console.log('[print:run] loadURL =>', url);
    await worker.loadURL(url);
    await new Promise((r) => worker.webContents.once('did-finish-load' as any, r));

    worker.webContents.send('print:payload', { template: templateWithBoxes, cheques });

    // give React/Canvas a moment to paint
    await new Promise((r) => setTimeout(r, 150));
    if (!args.silent) worker.focus();

    await new Promise<void>((resolve, reject) => {
      if (worker.webContents.isDestroyed()) return reject(new Error('Window destroyed'));
      worker.webContents.print(
        {
          silent: !!args.silent,
          copies: Math.max(1, args.copies ?? 1),
          deviceName: args.printerName || undefined,
          printBackground: true
        },
        (ok) => (ok ? resolve() : reject(new Error('Print failed')))
      );
    });

    if (args.silent && !worker.isDestroyed()) worker.close();
  });
}
