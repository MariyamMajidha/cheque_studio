-- path: electron/db/migrations/0001_init.sql
-- Schema bootstrap (SQLite)

-- =======================
-- Templates
-- =======================
CREATE TABLE IF NOT EXISTS templates(
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  width_mm        REAL    NOT NULL,
  height_mm       REAL    NOT NULL,
  dpi             INTEGER NOT NULL,
  orientation     TEXT    NOT NULL DEFAULT 'portrait',
  margin_mm       REAL    NOT NULL DEFAULT 5,
  background_path TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- =======================
-- Template boxes
-- NOTE: includes new date fields:
--   - date_format        (e.g. 'DDMMYYYY', 'MMDDYYYY', 'YYYYMMDD')
--   - date_digit_index   (0-based index of the digit to render)
-- =======================
CREATE TABLE IF NOT EXISTS template_boxes(
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id     INTEGER NOT NULL,
  label           TEXT,
  mapped_field    TEXT,
  x_mm            REAL,
  y_mm            REAL,
  w_mm            REAL,
  h_mm            REAL,
  font_family     TEXT,
  font_size       REAL,
  bold            INT  DEFAULT 0,
  italic          INT  DEFAULT 0,
  align           TEXT,
  uppercase       INT  DEFAULT 0,
  letter_spacing  REAL,
  line_height     REAL,
  color           TEXT,
  rotation        REAL DEFAULT 0,
  locked          INT  DEFAULT 0,
  z_index         INT  DEFAULT 0,
  -- NEW:
  date_format       TEXT,
  date_digit_index  INTEGER,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

-- =======================
-- Cheques
-- =======================
CREATE TABLE IF NOT EXISTS cheques(
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id  INTEGER NOT NULL,
  date         TEXT,
  payee        TEXT,
  amount       NUMERIC,
  amount_words TEXT,
  cheque_no    TEXT,
  account_no   TEXT,
  bank         TEXT,
  branch       TEXT,
  custom1      TEXT,
  custom2      TEXT,
  custom3      TEXT,
  custom4      TEXT,
  custom5      TEXT,
  custom6      TEXT,
  custom7      TEXT,
  custom8      TEXT,
  custom9      TEXT,
  custom10     TEXT,
  created_at   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
);

-- =======================
-- Printer profiles
-- =======================
CREATE TABLE IF NOT EXISTS printer_profiles(
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id  INTEGER NOT NULL,
  printer_name TEXT    NOT NULL,
  offset_x_mm  REAL    DEFAULT 0,
  offset_y_mm  REAL    DEFAULT 0,
  last_used_at TEXT,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- If you’re migrating an OLD database that already has template_boxes
-- without the date columns, you can uncomment the two lines below and
-- run this file once. After the columns exist, re-comment them.
-- NOTE: SQLite will throw an error if the column already exists.
-- --------------------------------------------------------------------
-- ALTER TABLE template_boxes ADD COLUMN date_format TEXT;
-- ALTER TABLE template_boxes ADD COLUMN date_digit_index INTEGER;
