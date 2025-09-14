// path: electron/ipc/handlers/templates.ts
import { ipcMain } from 'electron';
import { getDb } from '../../db/connection';
import {
  idSchema,
  templateCreateSchema,
  templateUpdateSchema,
  type TemplateCreate,
  type TemplatePatch
} from '../types';

let registered = false;

export function registerTemplateIpc(): void {
  if (registered) return;
  registered = true;

  // Hot-reload safety
  ipcMain.removeHandler('templates:list');
  ipcMain.removeHandler('templates:get');
  ipcMain.removeHandler('templates:create');
  ipcMain.removeHandler('templates:update');
  ipcMain.removeHandler('templates:delete');

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

  // --- create (returns new id)
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
    const stmt = db.prepare(
      `INSERT INTO templates
         (name, width_mm, height_mm, dpi, orientation, margin_mm, background_path, updated_at)
       VALUES
         (@name, @width_mm, @height_mm, @dpi, @orientation, @margin_mm, @background_path, datetime('now'))`
    );
    const info = stmt.run(withDefaults);
    return { id: Number(info.lastInsertRowid) };
  });

  // --- update (partial)
  // --- update (partial)
  ipcMain.handle('templates:update', (_evt, id: number, patch: TemplatePatch) => {
    // Validate id
    idSchema.parse(id);

    const db = getDb();

    // 1) Clean incoming patch: drop undefineds, trim name
    const cleaned: Partial<TemplatePatch> = {};
    for (const [k, v] of Object.entries(patch ?? {})) {
      if (v === undefined) continue;
      if (k === 'name' && typeof v === 'string') {
        (cleaned as any).name = v.trim();
      } else {
        (cleaned as any)[k] = v;
      }
    }

    // 2) Validate against schema (still allows partials)
    const valid = templateUpdateSchema.parse(cleaned);

    // 3) Nothing to update?
    const keys = Object.keys(valid) as (keyof TemplatePatch)[];
    if (!keys.length) return { updated: false };

    // 4) Build dynamic SET clause (only provided keys)
    const setSql = keys.map((k) => `${k}=@${k}`).join(', ');

    db.prepare(
      `UPDATE templates
       SET ${setSql},
           updated_at = datetime('now')
     WHERE id = @id`
    ).run({ id, ...(valid as Record<string, unknown>) });

    // 5) Return the updated row (handy for UI refresh without a re-list)
    const row = db
      .prepare(
        `SELECT id, name, width_mm, height_mm, dpi, orientation, margin_mm, background_path,
              datetime(updated_at, 'localtime') AS updated_at
         FROM templates
        WHERE id = ?`
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
}
