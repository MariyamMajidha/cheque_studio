// path: renderer/src/routes/Settings.tsx
import React from "react";

export default function Settings() {
  const [s, setS] = React.useState<any | null>(null);

  React.useEffect(() => {
    window.api.invoke("settings:get").then(setS);
  }, []);

  if (!s) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-xl font-semibold">Settings</h2>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label>Default DPI</label>
        <input className="border rounded px-2 py-1" type="number" value={s.defaultDpi} onChange={e => setS({ ...s, defaultDpi: Number(e.target.value) })} />
        <label>Grid (mm)</label>
        <input className="border rounded px-2 py-1" type="number" value={s.gridMm} onChange={e => setS({ ...s, gridMm: Number(e.target.value) })} />
      </div>
      <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => window.api.invoke("settings:set", s)}>
        Save Settings
      </button>
      <div className="pt-4 space-x-2">
        <button className="px-3 py-1 bg-gray-800 text-white rounded" onClick={() => window.api.invoke("backup:run")}>
          Backup DB (zip)
        </button>
        <button
          className="px-3 py-1 bg-gray-600 text-white rounded"
          onClick={async () => {
            const fp = prompt("Path to backup zip");
            if (fp) await window.api.invoke("restore:run", fp);
          }}
        >
          Restore from Zip
        </button>
      </div>
    </div>
  );
}
