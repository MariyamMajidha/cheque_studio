// path: renderer/src/routes/PrintPreview.tsx
import React from "react";

// Payload expected from main
type PreviewPayload = {
  template: any;
  cheques: any[];
  offsets?: { x: number; y: number };
};

const PreviewCanvas = React.lazy(() => import("../canvas/PreviewCanvas"));

function parseSearch(): Record<string, string> {
  const raw = globalThis.location?.hash || "";
  const i = raw.indexOf("?");
  const qs = new URLSearchParams(i >= 0 ? raw.slice(i + 1) : "");
  const out: Record<string, string> = {};
  qs.forEach((v, k) => (out[k] = v));
  return out;
}

export default function PrintPreview() {
  const [data, setData] = React.useState<PreviewPayload | null>(null);
  const [waiting, setWaiting] = React.useState(true);

  // 1) Subscribe first, then notify main we’re ready (prevents race)
  React.useEffect(() => {
    const off = window.api.print.onPayload((p: PreviewPayload) => {
      setData(p);
      setWaiting(false);
    });
    window.api.print.ready();
    return () => off();
  }, []);

  // 2) Optional fallback: show stub if query is present but IPC hasn’t arrived yet
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (data) return;
      const q = parseSearch();
      if (q.templateId || q.chequeIds) {
        setData({
          template: { name: "Loading… (waiting for IPC payload)" },
          cheques: [],
          offsets: { x: Number(q.ox ?? 0) || 0, y: Number(q.oy ?? 0) || 0 },
        });
      }
      setWaiting(false);
    }, 300);
    return () => clearTimeout(t);
  }, [data]);

  const doPrint = () => window.api.print.runCurrent();

  if (waiting && !data) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold">
          Print Preview — Loading… (waiting for IPC payload)
        </h2>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 space-y-2">
        <div className="text-red-600 font-medium">No preview data.</div>
        <div className="text-gray-600">
          Main must send <code>print:payload</code> after this page emits{" "}
          <code>print:ready</code>.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Print Preview{data.template?.name ? ` — ${data.template.name}` : ""}
        </h2>
        <button
          className="px-3 py-1 rounded bg-blue-600 text-white"
          onClick={doPrint}
        >
          Print
        </button>
      </div>

      <React.Suspense fallback={<div className="p-2">Rendering canvas…</div>}>
        <PreviewCanvas
          template={data.template}
          cheques={data.cheques}
          offsets={data.offsets ?? { x: 0, y: 0 }}
        />
      </React.Suspense>
    </div>
  );
}
