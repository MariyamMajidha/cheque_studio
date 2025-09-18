"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron8 = require("electron");
var import_node_path5 = __toESM(require("path"), 1);

// electron/ipc/handlers/boxes.ts
var import_electron2 = require("electron");

// electron/db/connection.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"), 1);
var import_electron = require("electron");
var import_node_path = __toESM(require("path"), 1);
var import_node_fs = __toESM(require("fs"), 1);
var db = null;
function getDb() {
  if (db) return db;
  const userData = import_electron.app.getPath("userData");
  const dbDir = import_node_path.default.join(userData, "data");
  const dbFile = process.env.DB_FILE || "cheque.sqlite3";
  const dbPath = import_node_path.default.join(dbDir, dbFile);
  import_node_fs.default.mkdirSync(dbDir, { recursive: true });
  db = new import_better_sqlite3.default(dbPath);
  db.pragma("journal_mode = wal");
  runMigrations(db);
  return db;
}
function runMigrations(database) {
  const candidates = [
    import_node_path.default.join(process.cwd(), "dist-electron", "db", "migrations"),
    import_node_path.default.join(process.cwd(), "electron", "db", "migrations"),
    import_node_path.default.join(process.resourcesPath || "", "db", "migrations")
  ];
  const dirToUse = candidates.find((p) => p && import_node_fs.default.existsSync(p));
  if (!dirToUse) {
    console.warn("[migrations] No migrations directory found. Skipping migration step.");
    return;
  }
  console.log("[migrations] Using directory:", dirToUse);
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations(
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
  const applied = new Set(
    database.prepare(`SELECT id FROM _migrations`).all().map((r) => r.id)
  );
  const files = import_node_fs.default.readdirSync(dirToUse).filter((f) => f.endsWith(".sql")).sort((a, b) => a.localeCompare(b));
  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    console.log(`[migrations] Applying: ${file}`);
    const sql = import_node_fs.default.readFileSync(import_node_path.default.join(dirToUse, file), "utf8");
    const tx = database.transaction(() => {
      database.exec(sql);
      database.prepare(`INSERT INTO _migrations(id, applied_at) VALUES(?, datetime('now'))`).run(file);
    });
    tx();
  }
}

// electron/ipc/handlers/boxes.ts
function detectDateCols() {
  const db2 = getDb();
  const cols = db2.prepare(`PRAGMA table_info(template_boxes)`).all();
  const hasFmt = cols.some((c) => c.name === "date_format");
  const hasIdx = cols.some((c) => c.name === "date_digit_index");
  return { hasFmt, hasIdx };
}
function registerBoxesIpc() {
  import_electron2.ipcMain.removeHandler("boxes:list");
  import_electron2.ipcMain.removeHandler("boxes:upsertMany");
  import_electron2.ipcMain.removeHandler("boxes:delete");
  import_electron2.ipcMain.handle("boxes:list", (_evt, templateId) => {
    const db2 = getDb();
    const { hasFmt, hasIdx } = detectDateCols();
    const extraSelect = [
      hasFmt ? "date_format" : `NULL AS date_format`,
      hasIdx ? "date_digit_index" : `NULL AS date_digit_index`
    ].join(", ");
    return db2.prepare(
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
    ).all(templateId);
  });
  import_electron2.ipcMain.handle("boxes:upsertMany", (_evt, templateId, boxes) => {
    const db2 = getDb();
    const { hasFmt, hasIdx } = detectDateCols();
    const del = db2.prepare(`DELETE FROM template_boxes WHERE template_id = ?`);
    const cols = [
      "template_id",
      "label",
      "mapped_field",
      "x_mm",
      "y_mm",
      "w_mm",
      "h_mm",
      "font_family",
      "font_size",
      "bold",
      "italic",
      "align",
      "uppercase",
      "letter_spacing",
      "line_height",
      "color",
      "rotation",
      "locked",
      "z_index",
      ...hasFmt ? ["date_format"] : [],
      ...hasIdx ? ["date_digit_index"] : []
    ];
    const placeholders = cols.map((c) => `@${c}`).join(", ");
    const ins = db2.prepare(
      `INSERT INTO template_boxes (${cols.join(", ")})
       VALUES (${placeholders})`
    );
    const tx = db2.transaction(() => {
      del.run(templateId);
      for (const b of boxes) {
        const row = {
          template_id: templateId,
          label: b.label,
          mapped_field: b.mapped_field,
          x_mm: b.x_mm,
          y_mm: b.y_mm,
          w_mm: b.w_mm,
          h_mm: b.h_mm,
          font_family: b.font_family ?? "System",
          font_size: b.font_size ?? 12,
          bold: b.bold ?? 0,
          italic: b.italic ?? 0,
          align: b.align ?? "left",
          uppercase: b.uppercase ?? 0,
          letter_spacing: b.letter_spacing ?? 0,
          line_height: b.line_height ?? 1.2,
          color: b.color ?? "#000000",
          rotation: b.rotation ?? 0,
          locked: b.locked ?? 0,
          z_index: b.z_index ?? 0
        };
        if (hasFmt) row.date_format = b.date_format ?? null;
        if (hasIdx) row.date_digit_index = b.date_digit_index ?? null;
        ins.run(row);
      }
    });
    tx();
    return;
  });
  import_electron2.ipcMain.handle("boxes:delete", (_evt, id) => {
    const db2 = getDb();
    db2.prepare(`DELETE FROM template_boxes WHERE id = ?`).run(id);
    return;
  });
}

// electron/ipc/handlers/templates.ts
var import_electron3 = require("electron");

// electron/ipc/types.ts
var import_zod = require("zod");

// shared/constants.ts
var Field = /* @__PURE__ */ ((Field2) => {
  Field2["PayeeName"] = "PayeeName";
  Field2["AmountWords"] = "AmountWords";
  Field2["AmountNumeric"] = "AmountNumeric";
  Field2["Date"] = "Date";
  return Field2;
})(Field || {});
var FIELD_OPTIONS = Object.values(
  Field
).map((v) => ({
  value: v,
  label: v.replace(/([A-Z])/g, " $1").trim()
}));

// electron/ipc/types.ts
var idSchema = import_zod.z.number().int().nonnegative();
var templateCreateSchema = import_zod.z.object({
  name: import_zod.z.string().min(1),
  width_mm: import_zod.z.number().positive(),
  height_mm: import_zod.z.number().positive(),
  dpi: import_zod.z.number().int().positive(),
  orientation: import_zod.z.enum(["Portrait", "Landscape"]),
  margin_mm: import_zod.z.number().min(0),
  background_path: import_zod.z.string().nullable().optional()
});
var templateUpdateSchema = templateCreateSchema.partial();
var boxSchema = import_zod.z.object({
  id: import_zod.z.number().int().nonnegative().optional(),
  template_id: import_zod.z.number().int().nonnegative(),
  label: import_zod.z.string(),
  mapped_field: import_zod.z.union([import_zod.z.nativeEnum(Field), import_zod.z.literal(""), import_zod.z.null()]),
  x_mm: import_zod.z.number(),
  y_mm: import_zod.z.number(),
  w_mm: import_zod.z.number().positive(),
  h_mm: import_zod.z.number().positive(),
  font_family: import_zod.z.string().default("System"),
  font_size: import_zod.z.number().positive().default(12),
  bold: import_zod.z.union([import_zod.z.literal(0), import_zod.z.literal(1)]).default(0),
  italic: import_zod.z.union([import_zod.z.literal(0), import_zod.z.literal(1)]).default(0),
  align: import_zod.z.enum(["left", "center", "right"]).default("left"),
  uppercase: import_zod.z.union([import_zod.z.literal(0), import_zod.z.literal(1)]).default(0),
  letter_spacing: import_zod.z.number().default(0),
  line_height: import_zod.z.number().positive().default(1.2),
  color: import_zod.z.string().default("#000000"),
  rotation: import_zod.z.number().default(0),
  locked: import_zod.z.union([import_zod.z.literal(0), import_zod.z.literal(1)]).default(0),
  z_index: import_zod.z.number().int().default(0),
  date_format: import_zod.z.string().nullable().optional(),
  date_digit_index: import_zod.z.number().int().min(0).max(7).nullable().optional()
});
var upsertBoxesSchema = import_zod.z.object({
  templateId: idSchema,
  boxes: import_zod.z.array(boxSchema)
});
var chequeCreateSchema = import_zod.z.object({
  template_id: idSchema,
  date: import_zod.z.string(),
  payee: import_zod.z.string(),
  amount: import_zod.z.number().nonnegative(),
  amount_words: import_zod.z.string()
});
var printPreviewSchema = import_zod.z.object({
  templateId: idSchema,
  chequeIds: import_zod.z.array(idSchema),
  printerName: import_zod.z.string().optional(),
  offsets: import_zod.z.object({
    offset_x_mm: import_zod.z.number().default(0),
    offset_y_mm: import_zod.z.number().default(0)
  }).optional()
});
var printRunSchema = printPreviewSchema.extend({
  copies: import_zod.z.number().int().min(1).default(1),
  silent: import_zod.z.boolean().default(false)
});

// electron/ipc/handlers/templates.ts
var registered = false;
function registerTemplateIpc() {
  if (registered) return;
  registered = true;
  import_electron3.ipcMain.removeHandler("templates:list");
  import_electron3.ipcMain.removeHandler("templates:get");
  import_electron3.ipcMain.removeHandler("templates:create");
  import_electron3.ipcMain.removeHandler("templates:update");
  import_electron3.ipcMain.removeHandler("templates:delete");
  import_electron3.ipcMain.handle("templates:list", () => {
    const db2 = getDb();
    return db2.prepare(
      `SELECT id, name, width_mm, height_mm, dpi, orientation, margin_mm, background_path,
                datetime(updated_at, 'localtime') AS updated_at
           FROM templates
          ORDER BY updated_at DESC, id DESC`
    ).all();
  });
  import_electron3.ipcMain.handle("templates:get", (_evt, id) => {
    idSchema.parse(id);
    const db2 = getDb();
    return db2.prepare(
      `SELECT id, name, width_mm, height_mm, dpi, orientation, margin_mm, background_path,
                datetime(updated_at, 'localtime') AS updated_at
           FROM templates
          WHERE id = ?`
    ).get(id);
  });
  import_electron3.ipcMain.handle("templates:create", (_evt, input) => {
    const withDefaults = templateCreateSchema.parse({
      name: input?.name ?? "New Template",
      width_mm: input?.width_mm ?? 210,
      height_mm: input?.height_mm ?? 99,
      dpi: input?.dpi ?? 300,
      orientation: input?.orientation ?? "Landscape",
      margin_mm: input?.margin_mm ?? 5,
      background_path: input?.background_path ?? null
    });
    const db2 = getDb();
    const stmt = db2.prepare(
      `INSERT INTO templates
         (name, width_mm, height_mm, dpi, orientation, margin_mm, background_path, updated_at)
       VALUES
         (@name, @width_mm, @height_mm, @dpi, @orientation, @margin_mm, @background_path, datetime('now'))`
    );
    const info = stmt.run(withDefaults);
    return { id: Number(info.lastInsertRowid) };
  });
  import_electron3.ipcMain.handle("templates:update", (_evt, id, patch) => {
    idSchema.parse(id);
    const db2 = getDb();
    const cleaned = {};
    for (const [k, v] of Object.entries(patch ?? {})) {
      if (v === void 0) continue;
      if (k === "name" && typeof v === "string") {
        cleaned.name = v.trim();
      } else {
        cleaned[k] = v;
      }
    }
    const valid = templateUpdateSchema.parse(cleaned);
    const keys = Object.keys(valid);
    if (!keys.length) return { updated: false };
    const setSql = keys.map((k) => `${k}=@${k}`).join(", ");
    db2.prepare(
      `UPDATE templates
       SET ${setSql},
           updated_at = datetime('now')
     WHERE id = @id`
    ).run({ id, ...valid });
    const row = db2.prepare(
      `SELECT id, name, width_mm, height_mm, dpi, orientation, margin_mm, background_path,
              datetime(updated_at, 'localtime') AS updated_at
         FROM templates
        WHERE id = ?`
    ).get(id);
    return { updated: true, row };
  });
  import_electron3.ipcMain.handle("templates:delete", (_evt, id) => {
    idSchema.parse(id);
    const db2 = getDb();
    const tx = db2.transaction(() => {
      db2.prepare("DELETE FROM template_boxes WHERE template_id=?").run(id);
      db2.prepare("DELETE FROM templates WHERE id=?").run(id);
    });
    tx();
  });
}

// electron/ipc/handlers/cheques.ts
var import_electron4 = require("electron");
var registered2 = false;
function registerChequesIpc() {
  if (registered2) return;
  registered2 = true;
  import_electron4.ipcMain.removeHandler("cheques:list");
  import_electron4.ipcMain.removeHandler("cheques:createOne");
  import_electron4.ipcMain.removeHandler("cheques:update");
  import_electron4.ipcMain.removeHandler("cheques:delete");
  import_electron4.ipcMain.removeHandler("cheques:importExcel");
  import_electron4.ipcMain.handle("cheques:list", (_evt, args) => {
    const db2 = getDb();
    const tid = Number(args?.template_id ?? 0);
    if (tid > 0) {
      idSchema.parse(tid);
      return db2.prepare(
        `SELECT id, template_id, date, payee, amount, amount_words,
                  datetime(created_at, 'localtime') AS created_at
             FROM cheques
            WHERE template_id = ?
            ORDER BY id DESC
            LIMIT 200`
      ).all(tid);
    }
    return db2.prepare(
      `SELECT id, template_id, date, payee, amount, amount_words,
                datetime(created_at, 'localtime') AS created_at
           FROM cheques
          ORDER BY id DESC
          LIMIT 200`
    ).all();
  });
  import_electron4.ipcMain.handle("cheques:createOne", (_evt, payload) => {
    const valid = chequeCreateSchema.parse(payload);
    const db2 = getDb();
    const stmt = db2.prepare(
      `INSERT INTO cheques
         (template_id, date, payee, amount, amount_words, created_at)
       VALUES
         (@template_id, @date, @payee, @amount, @amount_words, datetime('now'))`
    );
    const info = stmt.run(valid);
    return { id: Number(info.lastInsertRowid) };
  });
  import_electron4.ipcMain.handle("cheques:update", (_evt, id, patch) => {
    idSchema.parse(id);
    const keys = Object.keys(patch ?? {});
    if (!keys.length) return;
    const sets = keys.map((k) => `${k}=@${k}`).join(", ");
    const db2 = getDb();
    db2.prepare(
      `UPDATE cheques
          SET ${sets},
              created_at = datetime('now')
        WHERE id=@id`
    ).run({ id, ...patch });
  });
  import_electron4.ipcMain.handle("cheques:delete", (_evt, id) => {
    idSchema.parse(id);
    const db2 = getDb();
    db2.prepare(`DELETE FROM cheques WHERE id=?`).run(id);
  });
  import_electron4.ipcMain.handle("cheques:importExcel", async (_evt, args) => {
    console.log("[cheques:importExcel] args:", args);
    return { ok: true, imported: 0 };
  });
}

// electron/ipc/handlers/print.ts
var import_electron7 = require("electron");
var import_node_path4 = __toESM(require("path"), 1);

// electron/printing/print.ts
var import_electron6 = require("electron");
var import_node_path3 = __toESM(require("path"), 1);

// electron/printing/url.ts
var import_electron5 = require("electron");
var import_node_fs2 = __toESM(require("fs"), 1);
var import_node_path2 = __toESM(require("path"), 1);
function findBuiltIndex() {
  const appPath = import_electron5.app.getAppPath();
  const resPath = process.resourcesPath ?? "";
  const candidates = [
    import_node_path2.default.join(appPath, "dist", "renderer", "index.html"),
    import_node_path2.default.join(resPath, "dist", "renderer", "index.html"),
    import_node_path2.default.join(appPath, "dist", "index.html"),
    import_node_path2.default.join(resPath, "dist", "index.html"),
    import_node_path2.default.join(process.cwd(), "dist", "renderer", "index.html"),
    import_node_path2.default.join(process.cwd(), "dist", "index.html")
  ];
  const hit = candidates.find((p) => p && import_node_fs2.default.existsSync(p));
  if (!hit) {
    throw new Error(
      `[getAppUrl] Could not locate renderer index.html.
Checked:
${candidates.join("\n")}`
    );
  }
  return hit;
}
function findBuiltPreview() {
  const appPath = import_electron5.app.getAppPath();
  const resPath = process.resourcesPath ?? "";
  const candidates = [
    import_node_path2.default.join(appPath, "dist", "preview.html"),
    import_node_path2.default.join(resPath, "dist", "preview.html"),
    import_node_path2.default.join(process.cwd(), "dist", "preview.html")
  ];
  const hit = candidates.find((p) => p && import_node_fs2.default.existsSync(p));
  if (!hit) {
    throw new Error(
      `[getAppUrl] Could not locate preview.html.
Checked:
${candidates.join("\n")}`
    );
  }
  return hit;
}
function getAppUrl(hashPath) {
  const dev = process.env.VITE_DEV_SERVER_URL?.replace(/\/$/, "");
  if (hashPath.startsWith("/print/preview")) {
    const qIndex = hashPath.indexOf("?");
    const qs = qIndex >= 0 ? hashPath.slice(qIndex) : "";
    if (dev) {
      return `${dev}/preview.html${qs}`;
    }
    const previewFile = findBuiltPreview();
    return `file://${previewFile}${qs}`;
  }
  if (dev) {
    return `${dev}#${hashPath}`;
  }
  const main = import_electron5.BrowserWindow.getAllWindows()[0];
  const current = main?.webContents.getURL();
  if (current && current.startsWith("http")) {
    const origin = current.split("#")[0];
    return `${origin}#${hashPath}`;
  }
  const indexFile = findBuiltIndex();
  return `file://${indexFile}#${hashPath}`;
}

// electron/printing/print.ts
function buildPreviewUrl(templateId, chequeIds, ox = 0, oy = 0) {
  const ids = chequeIds.filter((n) => Number.isFinite(n) && n > 0);
  return getAppUrl(
    `/print/preview?templateId=${templateId}&chequeIds=${ids.join(",")}&ox=${ox}&oy=${oy}`
  );
}
function createPrintWindow(show = false) {
  return new import_electron6.BrowserWindow({
    width: 980,
    height: 740,
    show,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: import_node_path3.default.join(process.cwd(), "dist-electron", "preload.cjs")
    }
  });
}

// electron/ipc/handlers/print.ts
function registerPrintIpc() {
  import_electron7.ipcMain.removeHandler("print:preview");
  import_electron7.ipcMain.removeHandler("print:run");
  import_electron7.ipcMain.removeHandler("print:run-current");
  import_electron7.ipcMain.handle("print:preview", async (_evt, args) => {
    const db2 = getDb();
    const template = db2.prepare(
      `SELECT id, name, width_mm, height_mm, dpi, orientation, margin_mm, background_path
                FROM templates WHERE id = ?`
    ).get(args.templateId);
    if (!template) throw new Error("Template not found");
    const boxes = db2.prepare(
      `SELECT id, template_id, label, mapped_field,
                       x_mm, y_mm, w_mm, h_mm,
                       font_family, font_size, bold, italic, align, uppercase,
                       letter_spacing, line_height, color, rotation,
                       locked, z_index, date_format, date_digit_index
                 FROM template_boxes
                 WHERE template_id = ?
                 ORDER BY z_index ASC, id ASC`
    ).all(args.templateId);
    const ids = (args.chequeIds ?? []).filter((n) => Number.isFinite(n) && n > 0);
    const cheques = ids.length ? db2.prepare(
      `SELECT id, template_id, date, payee, amount, amount_words
                    FROM cheques
                    WHERE id IN (${ids.map(() => "?").join(",")})
                    ORDER BY id ASC`
    ).all(...ids) : [];
    const templateWithBoxes = { ...template, _boxes: boxes };
    const ox = args.offsets?.offset_x_mm ?? 0;
    const oy = args.offsets?.offset_y_mm ?? 0;
    const previewWin = new import_electron7.BrowserWindow({
      width: 980,
      height: 740,
      show: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: import_node_path4.default.join(process.cwd(), "dist-electron", "preload.cjs")
      }
    });
    const url = getAppUrl(
      `/print/preview?templateId=${args.templateId}&chequeIds=${ids.join(",")}&ox=${ox}&oy=${oy}`
    );
    await previewWin.loadURL(url);
    const targetId = previewWin.webContents.id;
    const onReady = (evt) => {
      if (evt.sender.id !== targetId) return;
      evt.sender.send("print:payload", {
        template: templateWithBoxes,
        cheques,
        offsets: { x: ox, y: oy }
      });
      import_electron7.ipcMain.removeListener("print:ready", onReady);
    };
    import_electron7.ipcMain.on("print:ready", onReady);
  });
  import_electron7.ipcMain.handle("print:run", async (_evt, args) => {
    const db2 = getDb();
    const template = db2.prepare(
      `SELECT id, name, width_mm, height_mm, dpi, orientation, margin_mm, background_path
                FROM templates WHERE id = ?`
    ).get(args.templateId);
    if (!template) throw new Error("Template not found");
    const boxes = db2.prepare(
      `SELECT id, template_id, label, mapped_field,
                       x_mm, y_mm, w_mm, h_mm,
                       font_family, font_size, bold, italic, align, uppercase,
                       letter_spacing, line_height, color, rotation,
                       locked, z_index, date_format, date_digit_index
                 FROM template_boxes
                 WHERE template_id = ?
                 ORDER BY z_index ASC, id ASC`
    ).all(args.templateId);
    const ids = (args.chequeIds ?? []).filter((n) => Number.isFinite(n) && n > 0);
    const cheques = ids.length ? db2.prepare(
      `SELECT id, template_id, date, payee, amount, amount_words
                    FROM cheques
                    WHERE id IN (${ids.map(() => "?").join(",")})
                    ORDER BY id ASC`
    ).all(...ids) : [];
    const templateWithBoxes = { ...template, _boxes: boxes };
    const ox = args.offsets?.offset_x_mm ?? 0;
    const oy = args.offsets?.offset_y_mm ?? 0;
    const worker = createPrintWindow(!args.silent);
    const wurl = buildPreviewUrl(args.templateId, ids, ox, oy);
    await worker.loadURL(wurl);
    await new Promise((r) => worker.webContents.once("did-finish-load", r));
    worker.webContents.send("print:payload", {
      template: templateWithBoxes,
      cheques,
      offsets: { x: ox, y: oy }
    });
    await new Promise((r) => setTimeout(r, 150));
    if (!args.silent) worker.focus();
    await new Promise((resolve, reject) => {
      if (worker.webContents.isDestroyed()) return reject(new Error("Window destroyed"));
      worker.webContents.print(
        {
          silent: !!args.silent,
          copies: Math.max(1, args.copies ?? 1),
          deviceName: args.printerName || void 0,
          printBackground: true
        },
        (ok) => ok ? resolve() : reject(new Error("Print failed"))
      );
    });
    if (args.silent && !worker.isDestroyed()) worker.close();
  });
  import_electron7.ipcMain.on("print:run-current", (evt) => {
    const contents = evt.sender;
    contents.print({ silent: false, printBackground: true }, (ok, err) => {
      if (!ok && err) console.error("print:run-current failed:", err);
    });
  });
}

// electron/main.ts
var isDev = !import_electron8.app.isPackaged;
try {
  process.stdout.on?.("error", (err) => {
    if (err && err.code === "EPIPE") return;
    throw err;
  });
  process.stderr.on?.("error", (err) => {
    if (err && err.code === "EPIPE") return;
    throw err;
  });
} catch {
}
if (isDev && !process.env.VITE_DEV_SERVER_URL) {
  process.env.VITE_DEV_SERVER_URL = "http://localhost:5173";
}
function createWindow() {
  const win = new import_electron8.BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    // show after ready-to-show to avoid flashes
    webPreferences: {
      preload: isDev ? import_node_path5.default.join(process.cwd(), "dist-electron", "preload.cjs") : import_node_path5.default.join(process.resourcesPath, "dist-electron", "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  const url = isDev ? process.env.VITE_DEV_SERVER_URL : `file://${import_node_path5.default.join(process.resourcesPath, "dist", "index.html")}`;
  console.log("[main] isDev:", isDev, "\u2192 loading:", url);
  win.loadURL(url).catch((e) => console.error("[main] loadURL error:", e));
  win.once("ready-to-show", () => win.show());
  if (isDev) win.webContents.openDevTools({ mode: "detach" });
  win.webContents.on("render-process-gone", (_e, details) => {
    console.error("[main] renderer gone:", details);
  });
  return win;
}
var gotLock = import_electron8.app.requestSingleInstanceLock();
if (!gotLock) {
  import_electron8.app.quit();
} else {
  import_electron8.app.on("second-instance", () => {
    const [win] = import_electron8.BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  import_electron8.app.whenReady().then(() => {
    registerTemplateIpc();
    registerBoxesIpc();
    registerChequesIpc();
    registerPrintIpc();
    createWindow();
    import_electron8.app.on("activate", () => {
      if (import_electron8.BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  import_electron8.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") import_electron8.app.quit();
  });
}
