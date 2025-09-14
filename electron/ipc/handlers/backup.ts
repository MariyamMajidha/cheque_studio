// path: electron/ipc/handlers/backup.ts
import { ipcMain, app, dialog } from "electron";
import path from "node:path";
import fs from "node:fs";
import JSZip from "jszip";

export function registerBackupHandlers() {
  ipcMain.handle("backup:run", async () => {
    const userData = app.getPath("userData");
    const dbDir = path.join(userData, "data");
    const dbPath = path.join(dbDir, "cheque.sqlite3");

    const zip = new JSZip();
    zip.file("cheque.sqlite3", fs.readFileSync(dbPath));

    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `cheque_backup_${new Date().toISOString().slice(0, 10)}.zip`
    });
    if (!filePath) return { ok: false };

    const content = await zip.generateAsync({ type: "nodebuffer" });
    fs.writeFileSync(filePath, content);
    return { ok: true, filePath };
  });

  ipcMain.handle("restore:run", async (_e, filePath: string) => {
    const buff = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buff);
    const sqlite = await zip.file("cheque.sqlite3")!.async("nodebuffer");

    const userData = app.getPath("userData");
    const dbDir = path.join(userData, "data");
    fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(path.join(dbDir, "cheque.sqlite3"), sqlite);
    return { ok: true };
  });
}
