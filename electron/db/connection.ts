// path: electron/db/connection.ts
import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const userData = app.getPath('userData');
  const dbDir = path.join(userData, 'data');
  const dbFile = process.env.DB_FILE || 'cheque.sqlite3';
  const dbPath = path.join(dbDir, dbFile);

  fs.mkdirSync(dbDir, { recursive: true });

  // console.log('[DB] userData path:', userData);
  // console.log('[DB] dbDir:', dbDir);
  // console.log('[DB] dbFile:', dbFile);
  // console.log('[DB] dbPath:', dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = wal');

  runMigrations(db);

  return db;
}

function runMigrations(database: Database.Database) {
  // Candidate locations for migrations, in priority order:
  //  1) dist-electron/db/migrations        (dev, after tsup copy or watcher)
  //  2) electron/db/migrations             (dev, source tree)
  //  3) <resources>/db/migrations          (packaged app)
  const candidates = [
    path.join(process.cwd(), 'dist-electron', 'db', 'migrations'),
    path.join(process.cwd(), 'electron', 'db', 'migrations'),
    path.join(process.resourcesPath || '', 'db', 'migrations')
  ];

  const dirToUse = candidates.find((p) => p && fs.existsSync(p));

  if (!dirToUse) {
    console.warn('[migrations] No migrations directory found. Skipping migration step.');
    return;
  }

  console.log('[migrations] Using directory:', dirToUse);

  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations(
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set<string>(
    database
      .prepare(`SELECT id FROM _migrations`)
      .all()
      .map((r: any) => r.id)
  );

  const files = fs
    .readdirSync(dirToUse)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    if (applied.has(file)) {
      //console.log(`[migrations] Already applied: ${file}`);
      continue;
    }

    console.log(`[migrations] Applying: ${file}`);
    const sql = fs.readFileSync(path.join(dirToUse, file), 'utf8');

    const tx = database.transaction(() => {
      database.exec(sql);
      database
        .prepare(`INSERT INTO _migrations(id, applied_at) VALUES(?, datetime('now'))`)
        .run(file);
    });

    tx();
    // console.log(`[migrations] Applied: ${file}`);
  }
}
