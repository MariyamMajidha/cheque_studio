import { ipcMain } from 'electron';
import { getDb } from '../../db/connection';
import { idSchema, chequeCreateSchema, type ChequeCreate } from '../types';

let registered = false;

export function registerChequesIpc(): void {
  if (registered) return;
  registered = true;

  // Clean old dev handlers (hot-reload safe)
  ipcMain.removeHandler('cheques:list');
  ipcMain.removeHandler('cheques:createOne');
  ipcMain.removeHandler('cheques:update');
  ipcMain.removeHandler('cheques:delete');
  ipcMain.removeHandler('cheques:importExcel');

  /**
   * LIST:
   * - If args.template_id > 0 → list for that template
   * - If args.template_id <= 0 or not provided → list recent across ALL templates
   */
  ipcMain.handle('cheques:list', (_evt, args: { template_id?: number }) => {
    const db = getDb();
    const tid = Number(args?.template_id ?? 0);

    if (tid > 0) {
      // Validate only when we actually filter by a specific id
      idSchema.parse(tid);
      return db
        .prepare(
          `SELECT id, template_id, date, payee, amount, amount_words,
                  datetime(created_at, 'localtime') AS created_at
             FROM cheques
            WHERE template_id = ?
            ORDER BY id DESC
            LIMIT 200`
        )
        .all(tid);
    }

    // Show recent across all templates
    return db
      .prepare(
        `SELECT id, template_id, date, payee, amount, amount_words,
                datetime(created_at, 'localtime') AS created_at
           FROM cheques
          ORDER BY id DESC
          LIMIT 200`
      )
      .all();
  });

  // CREATE ONE (amount_words is required by schema)
  ipcMain.handle('cheques:createOne', (_evt, payload: unknown) => {
    const valid = chequeCreateSchema.parse(payload);

    const db = getDb();
    const stmt = db.prepare(
      `INSERT INTO cheques
         (template_id, date, payee, amount, amount_words, created_at)
       VALUES
         (@template_id, @date, @payee, @amount, @amount_words, datetime('now'))`
    );

    const info = stmt.run(valid);
    return { id: Number(info.lastInsertRowid) };
  });

  // UPDATE (partial)
  ipcMain.handle('cheques:update', (_evt, id: number, patch: Partial<ChequeCreate>) => {
    idSchema.parse(id);

    const keys = Object.keys(patch ?? {});
    if (!keys.length) return;

    const sets = keys.map((k) => `${k}=@${k}`).join(', ');
    const db = getDb();
    db.prepare(
      `UPDATE cheques
          SET ${sets},
              created_at = datetime('now')
        WHERE id=@id`
    ).run({ id, ...(patch as Record<string, unknown>) });
  });

  // DELETE
  ipcMain.handle('cheques:delete', (_evt, id: number) => {
    idSchema.parse(id);
    const db = getDb();
    db.prepare(`DELETE FROM cheques WHERE id=?`).run(id);
  });

  // IMPORT (stub)
  ipcMain.handle('cheques:importExcel', async (_evt, args: any) => {
    console.log('[cheques:importExcel] args:', args);
    return { ok: true, imported: 0 };
  });
}
