// path: electron/ipc/handlers/settings.ts
import { ipcMain, app } from "electron";
import path from "node:path";
import fs from "node:fs";

type Settings = {
  defaultDpi: number;
  gridMm: number;
  dataDir: string;
};

const defaults: Settings = {
  defaultDpi: 300,
  gridMm: 1,
  dataDir: ""
};

export function registerSettingsHandlers() {
  const file = path.join(app.getPath("userData"), "settings.json");

  function load(): Settings {
    if (!fs.existsSync(file)) return { ...defaults, dataDir: app.getPath("userData") };
    return JSON.parse(fs.readFileSync(file, "utf8")) as Settings;
    }

  function save(s: Settings) {
    fs.writeFileSync(file, JSON.stringify(s, null, 2));
  }

  ipcMain.handle("settings:get", () => load());
  ipcMain.handle("settings:set", (_e, patch: Partial<Settings>) => {
    const cur = load();
    const next = { ...cur, ...patch };
    save(next);
    return next;
  });
}
