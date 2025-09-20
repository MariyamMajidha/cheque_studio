// path: electron/ipc/handlers/templates.ts
import { app, dialog, ipcMain, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { getDb } from '../../db/connection';
import {
  idSchema,
  templateCreateSchema,
  templateUpdateSchema,
  type TemplateCreate,
  type TemplatePatch
} from '../types';

let registered = false;

function guessMime(p: string): string {
  const ext = path.extname(p).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'image/png';
}

export function registerTemplateIpc(): void {
  if (registered) return;
  registered = true;

  ipcMain.removeHandler('templates:list');
  ipcMain.removeHandler('templates:get');
  ipcMain.removeHandler('templates:create');
  ipcMain.removeHandler('templates:update');
  ipcMain.removeHandler('templates:delete');
  ipcMain.removeHandler('templates:pickBackground');
  ipcMain.removeHandler('templates:clearBackground');
  ipcMain.removeHandler('templates:getBackgroundDataUrl'); // NEW

  // --- list
  ipcMain.handle('templates:list', () => {
    const db = getDb();
    return db
      .prepare(
        `SELECT id, name, width_mm, height_mm, dpi, orientation, margin_mm, background_path,
                datetime(updated_at, 'localtime') AS updated_at
           FROM templates
          ORDER BY updated_at DESC, id DESC`
      )
      .all();
  });

  // --- get
  ipcMain.handle('templates:get', (_evt, id: number) => {
    idSchema.parse(id);
    const db = getDb();
    return db
      .prepare(
        `SELECT id, name, width_mm, height_mm, dpi, orientation, margin_mm, background_path,
                datetime(updated_at, 'localtime') AS updated_at
           FROM templates
          WHERE id = ?`
      )
      .get(id);
  });

  // --- create
  ipcMain.handle('templates:create', (_evt, input?: Partial<TemplateCreate>) => {
    const withDefaults: TemplateCreate = templateCreateSchema.parse({
      name: input?.name ?? 'New Template',
      width_mm: input?.width_mm ?? 210,
      height_mm: input?.height_mm ?? 99,
      dpi: input?.dpi ?? 300,
      orientation: input?.orientation ?? 'Landscape',
      margin_mm: input?.margin_mm ?? 5,
      background_path: input?.background_path ?? null
    });

    const db = getDb();
    const info = db
      .prepare(
        `INSERT INTO templates
         (name, width_mm, height_mm, dpi, orientation, margin_mm, background_path, updated_at)
         VALUES (@name, @width_mm, @height_mm, @dpi, @orientation, @margin_mm, @background_path, datetime('now'))`
      )
      .run(withDefaults);
    return { id: Number(info.lastInsertRowid) };
  });

  // --- update
  ipcMain.handle('templates:update', (_evt, id: number, patch: TemplatePatch) => {
    idSchema.parse(id);
    const db = getDb();

    const cleaned: Partial<TemplatePatch> = {};
    for (const [k, v] of Object.entries(patch ?? {})) {
      if (v === undefined) continue;
      (cleaned as any)[k] = k === 'name' && typeof v === 'string' ? v.trim() : v;
    }

    const valid = templateUpdateSchema.parse(cleaned);
    const keys = Object.keys(valid) as (keyof TemplatePatch)[];
    if (!keys.length) return { updated: false };

    const setSql = keys.map((k) => `${k}=@${k}`).join(', ');
    db.prepare(`UPDATE templates SET ${setSql}, updated_at = datetime('now') WHERE id = @id`).run({
      id,
      ...(valid as Record<string, unknown>)
    });

    const row = db
      .prepare(
        `SELECT id, name, width_mm, height_mm, dpi, orientation, margin_mm, background_path,
                datetime(updated_at, 'localtime') AS updated_at
         FROM templates WHERE id = ?`
      )
      .get(id);
    return { updated: true, row };
  });

  // --- delete
  ipcMain.handle('templates:delete', (_evt, id: number) => {
    idSchema.parse(id);
    const db = getDb();
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM template_boxes WHERE template_id=?').run(id);
      db.prepare('DELETE FROM templates WHERE id=?').run(id);
    });
    tx();
  });

  // --- pick background
  ipcMain.handle('templates:pickBackground', async (_evt, id: number) => {
    idSchema.parse(id);

    // Use the SYNC variant → returns string[] | undefined (no typing confusion)
    const filePaths = dialog.showOpenDialogSync({
      title: 'Choose background image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    });

    if (!filePaths || filePaths.length === 0) {
      return { ok: false };
    }

    const src = filePaths[0];
    const dir = path.join(app.getPath('userData'), 'backgrounds');
    await fsp.mkdir(dir, { recursive: true });

    const ext = (path.extname(src) || '.png').toLowerCase();
    const dest = path.join(dir, `template-${id}${ext}`);
    await fsp.copyFile(src, dest);

    const db = getDb();
    db.prepare(
      `UPDATE templates
       SET background_path = ?, updated_at = datetime('now')
     WHERE id = ?`
    ).run(dest, id);

    return { ok: true };
  });

  // --- clear background
  ipcMain.handle('templates:clearBackground', async (_evt, id: number) => {
    idSchema.parse(id);
    const db = getDb();
    const row = db.prepare('SELECT background_path FROM templates WHERE id = ?').get(id) as
      | { background_path?: string }
      | undefined;

    const p = row?.background_path;
    if (p && fs.existsSync(p)) {
      try {
        await fsp.unlink(p);
      } catch {
        /* ignore */
      }
    }

    db.prepare(
      `UPDATE templates SET background_path = NULL, updated_at = datetime('now') WHERE id = ?`
    ).run(id);

    return { ok: true };
  });

  // --- NEW: read background as data URL (safe for http:// renderer)
  ipcMain.handle('templates:getBackgroundDataUrl', async (_evt, id: number) => {
    idSchema.parse(id);
    const db = getDb();
    const row = db.prepare('SELECT background_path FROM templates WHERE id = ?').get(id) as
      | { background_path?: string }
      | undefined;

    const p = row?.background_path;
    if (!p || !fs.existsSync(p)) return { ok: false, dataUrl: null };

    const buf = await fsp.readFile(p);
    const mime = guessMime(p);
    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
    return { ok: true, dataUrl };
  });
}
