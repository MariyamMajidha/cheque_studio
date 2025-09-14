// path: electron/ipc/handlers/boxes.ts
import { ipcMain } from 'electron';
import { getDb } from '../../db/connection';
import type { BoxRow } from '../types';

/**
 * Check if the optional date-related columns exist on template_boxes.
 * We keep this dynamic so older databases still work without migrations.
 */
function detectDateCols(): { hasFmt: boolean; hasIdx: boolean } {
  const db = getDb();
  const cols = db.prepare(`PRAGMA table_info(template_boxes)`).all() as Array<{ name: string }>;
  const hasFmt = cols.some((c) => c.name === 'date_format');
  const hasIdx = cols.some((c) => c.name === 'date_digit_index');
  return { hasFmt, hasIdx };
}

export function registerBoxesIpc(): void {
  // Hot-reload safety in dev
  ipcMain.removeHandler('boxes:list');
  ipcMain.removeHandler('boxes:upsertMany');
  ipcMain.removeHandler('boxes:delete');

  /** -------------------- LIST -------------------- */
  ipcMain.handle('boxes:list', (_evt, templateId: number): BoxRow[] => {
    const db = getDb();
    const { hasFmt, hasIdx } = detectDateCols();

    // If the columns are missing, project NULLs so the renderer still gets keys.
    const extraSelect = [
      hasFmt ? 'date_format' : `NULL AS date_format`,
      hasIdx ? 'date_digit_index' : `NULL AS date_digit_index`
    ].join(', ');

    return db
      .prepare(
        `SELECT id, template_id, label, mapped_field,
                x_mm, y_mm, w_mm, h_mm,
                font_family, font_size,
                bold, italic, align, uppercase,
                letter_spacing, line_height, color, rotation,
                locked, z_index,
                ${extraSelect}
           FROM template_boxes
          WHERE template_id = ?
          ORDER BY z_index ASC, id ASC`
      )
      .all(templateId) as BoxRow[];
  });

  /** ------------------ UPSERT MANY ------------------ */
  ipcMain.handle('boxes:upsertMany', (_evt, templateId: number, boxes: BoxRow[]) => {
    const db = getDb();
    const { hasFmt, hasIdx } = detectDateCols();

    const del = db.prepare(`DELETE FROM template_boxes WHERE template_id = ?`);

    // Build column list dynamically so it works whether or not new columns exist.
    const cols = [
      'template_id',
      'label',
      'mapped_field',
      'x_mm',
      'y_mm',
      'w_mm',
      'h_mm',
      'font_family',
      'font_size',
      'bold',
      'italic',
      'align',
      'uppercase',
      'letter_spacing',
      'line_height',
      'color',
      'rotation',
      'locked',
      'z_index',
      ...(hasFmt ? ['date_format'] : []),
      ...(hasIdx ? ['date_digit_index'] : [])
    ];
    const placeholders = cols.map((c) => `@${c}`).join(', ');

    const ins = db.prepare(
      `INSERT INTO template_boxes (${cols.join(', ')})
       VALUES (${placeholders})`
    );

    const tx = db.transaction(() => {
      del.run(templateId);
      for (const b of boxes) {
        const row: any = {
          template_id: templateId,
          label: b.label,
          mapped_field: b.mapped_field,
          x_mm: b.x_mm,
          y_mm: b.y_mm,
          w_mm: b.w_mm,
          h_mm: b.h_mm,
          font_family: b.font_family ?? 'System',
          font_size: b.font_size ?? 12,
          bold: b.bold ?? 0,
          italic: b.italic ?? 0,
          align: b.align ?? 'left',
          uppercase: b.uppercase ?? 0,
          letter_spacing: b.letter_spacing ?? 0,
          line_height: b.line_height ?? 1.2,
          color: b.color ?? '#000000',
          rotation: b.rotation ?? 0,
          locked: b.locked ?? 0,
          z_index: b.z_index ?? 0
        };
        if (hasFmt) row.date_format = (b as any).date_format ?? null;
        if (hasIdx) row.date_digit_index = (b as any).date_digit_index ?? null;

        ins.run(row);
      }
    });

    tx();
    return;
  });

  /** -------------------- DELETE -------------------- */
  ipcMain.handle('boxes:delete', (_evt, id: number) => {
    const db = getDb();
    db.prepare(`DELETE FROM template_boxes WHERE id = ?`).run(id);
    return;
  });
}
