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

/* ---------- helpers ---------- */
function guessMime(p: string): string {
  const ext = path.extname(p).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'image/png';
}
function extFromMime(m: string): string {
  if (m === 'image/jpeg') return '.jpg';
  if (m === 'image/webp') return '.webp';
  if (m === 'image/png') return '.png';
  return '.png';
}
function safeName(name: string): string {
  return (name || 'template')
    .replace(/[^\w\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

type TemplateRowForExport = {
  id: number;
  name: string;
  width_mm: number;
  height_mm: number;
  dpi: number;
  orientation: string;
  margin_mm: number;
  background_path?: string | null;
};

type BoxRowForExport = {
  label: string;
  mapped_field: string | null;
  x_mm: number;
  y_mm: number;
  w_mm: number;
  h_mm: number;
  font_family: string | null;
  font_size: number | null;
  bold: 0 | 1;
  italic: 0 | 1;
  align: string | null;
  uppercase: 0 | 1;
  letter_spacing: number | null;
  line_height: number | null;
  color: string | null;
  rotation: number | null;
  locked: 0 | 1;
  z_index: number | null;
  date_format: string | null;
  date_digit_index: number | null;
};

async function buildTemplateExportPayload(id: number) {
  const db = getDb();

  const tpl = db
    .prepare(
      `SELECT id, name, width_mm, height_mm, dpi, orientation, margin_mm, background_path
         FROM templates WHERE id = ?`
    )
    .get(id) as TemplateRowForExport | undefined;

  if (!tpl) throw new Error('Template not found');

  const boxes = db
    .prepare(
      `SELECT label, mapped_field, x_mm, y_mm, w_mm, h_mm,
              font_family, font_size, bold, italic, align, uppercase,
              letter_spacing, line_height, color, rotation, locked, z_index,
              date_format, date_digit_index
         FROM template_boxes
        WHERE template_id = ?
        ORDER BY z_index ASC, id ASC`
    )
    .all(id) as BoxRowForExport[];

  let background: null | { filename: string; mime: string; data: string } = null;
  if (tpl.background_path && fs.existsSync(tpl.background_path)) {
    const mime = guessMime(tpl.background_path);
    const data = (await fsp.readFile(tpl.background_path)).toString('base64');
    background = {
      filename: path.basename(tpl.background_path),
      mime,
      data
    };
  }

  return {
    _kind: 'cheque-template',
    version: 1,
    template: {
      name: tpl.name,
      width_mm: tpl.width_mm,
      height_mm: tpl.height_mm,
      dpi: tpl.dpi,
      orientation: tpl.orientation,
      margin_mm: tpl.margin_mm
    },
    background,
    boxes
  };
}

async function importTemplatePayload(payload: any): Promise<{ id: number; name: string }> {
  const db = getDb();
  if (!payload || payload._kind !== 'cheque-template' || !payload.template) {
    throw new Error('Not a template export');
  }

  const baseName = String(payload.template.name || 'Imported Template');
  let name = baseName;
  let n = 1;
  while (db.prepare('SELECT 1 FROM templates WHERE name = ? LIMIT 1').get(name)) {
    name = `${baseName} (${++n})`;
  }

  const info = db
    .prepare(
      `INSERT INTO templates
         (name, width_mm, height_mm, dpi, orientation, margin_mm, background_path, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, datetime('now'))`
    )
    .run(
      name,
      Number(payload.template.width_mm) || 210,
      Number(payload.template.height_mm) || 99,
      Number(payload.template.dpi) || 300,
      String(payload.template.orientation || 'Landscape'),
      Number(payload.template.margin_mm) || 5
    );
  const newId = Number(info.lastInsertRowid);

  if (payload.background?.data && payload.background?.mime) {
    const dir = path.join(app.getPath('userData'), 'backgrounds');
    await fsp.mkdir(dir, { recursive: true });
    const ext = extFromMime(String(payload.background.mime));
    const dest = path.join(dir, `template-${newId}${ext}`);
    await fsp.writeFile(dest, Buffer.from(String(payload.background.data), 'base64'));
    db.prepare(
      `UPDATE templates SET background_path = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(dest, newId);
  }

  const insertBox = db.prepare(
    `INSERT INTO template_boxes
       (template_id, label, mapped_field, x_mm, y_mm, w_mm, h_mm,
        font_family, font_size, bold, italic, align, uppercase,
        letter_spacing, line_height, color, rotation, locked, z_index,
        date_format, date_digit_index)
     VALUES
       (@template_id, @label, @mapped_field, @x_mm, @y_mm, @w_mm, @h_mm,
        @font_family, @font_size, @bold, @italic, @align, @uppercase,
        @letter_spacing, @line_height, @color, @rotation, @locked, @z_index,
        @date_format, @date_digit_index)`
  );

  const rows = Array.isArray(payload.boxes) ? payload.boxes : [];
  const tx = db.transaction((rs: any[]) => {
    rs.forEach((b: any, idx: number) => {
      insertBox.run({
        template_id: newId,
        label: b.label ?? 'Field',
        mapped_field: b.mapped_field ?? null,
        x_mm: Number(b.x_mm) || 0,
        y_mm: Number(b.y_mm) || 0,
        w_mm: Number(b.w_mm) || 10,
        h_mm: Number(b.h_mm) || 10,
        font_family: b.font_family ?? null,
        font_size: Number(b.font_size) || 12,
        bold: b.bold ? 1 : 0,
        italic: b.italic ? 1 : 0,
        align: b.align ?? 'left',
        uppercase: b.uppercase ? 1 : 0,
        letter_spacing: b.letter_spacing ?? null,
        line_height: b.line_height ?? null,
        color: b.color ?? '#000000',
        rotation: Number(b.rotation) || 0,
        locked: b.locked ? 1 : 0,
        z_index: Number(b.z_index ?? idx) || idx,
        date_format: b.date_format ?? null,
        date_digit_index: typeof b.date_digit_index === 'number' ? b.date_digit_index : null
      });
    });
  });
  tx(rows);

  return { id: newId, name };
}

/* ---------- handlers ---------- */
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
  ipcMain.removeHandler('templates:getBackgroundDataUrl');
  // NEW bulk I/O
  ipcMain.removeHandler('templates:exportMany');
  ipcMain.removeHandler('templates:importMany');

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

    const filePaths = dialog.showOpenDialogSync({
      title: 'Choose background image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    });
    if (!filePaths || filePaths.length === 0) return { ok: false };

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

  // --- read background as data URL (safe for http:// renderer)
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

  // Choose a folder; write one JSON file per id.
  ipcMain.handle('templates:exportMany', async (_evt, ids: number[]) => {
    const dirPaths = dialog.showOpenDialogSync({
      title: 'Choose folder to export templates',
      properties: ['openDirectory', 'createDirectory']
    });

    if (!dirPaths || dirPaths.length === 0) {
      return { ok: false, exported: 0 };
    }

    const dir = dirPaths[0];
    let count = 0;

    for (const id of ids || []) {
      try {
        const payload = await buildTemplateExportPayload(Number(id));
        const fname = `${safeName(payload.template.name)}.cps.json`;
        await fsp.writeFile(path.join(dir, fname), JSON.stringify(payload, null, 2), 'utf8');
        count++;
      } catch {
        // skip bad id
      }
    }

    return { ok: count > 0, exported: count, dir };
  });

  // Pick multiple JSON files; create templates for each.
  ipcMain.handle('templates:importMany', async () => {
    const files = dialog.showOpenDialogSync({
      title: 'Import templates',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Template JSON', extensions: ['json'] }]
    });

    if (!files || files.length === 0) {
      return { ok: false, imported: 0 };
    }

    let imported = 0;
    const created: Array<{ id: number; name: string }> = [];

    for (const file of files) {
      try {
        const raw = await fsp.readFile(file, 'utf8');
        const data = JSON.parse(raw);

        if (data && Array.isArray(data.items)) {
          // bundle with multiple templates
          for (const item of data.items) {
            const res = await importTemplatePayload(item);
            created.push(res);
            imported++;
          }
        } else {
          // single template file
          const res = await importTemplatePayload(data);
          created.push(res);
          imported++;
        }
      } catch {
        // skip bad file
      }
    }

    return { ok: imported > 0, imported, created };
  });
}
