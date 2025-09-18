import React from "react";

// Lazy canvas so the window paints fast
const PreviewCanvas = React.lazy(() => import("../canvas/PreviewCanvas"));

/** Very small helper to read hash query: #/print/preview?ox=..&oy=.. */
function readQuery(): Record<string, string> {
  const hash = globalThis.location?.hash ?? "";
  const qPos = hash.indexOf("?");
  const sp = new URLSearchParams(qPos >= 0 ? hash.slice(qPos + 1) : "");
  const out: Record<string, string> = {};
  sp.forEach((v, k) => (out[k] = v));
  return out;
}

type PreviewPayload = {
  template: any;
  cheques: any[];
  offsets?: { x: number; y: number };
};

export default function PrintPreview() {
  const [data, setData] = React.useState<PreviewPayload | null>(null);
  const [zoom, setZoom] = React.useState(1); // screen-only zoom (reset for print)

  // Receive payload from main
  React.useEffect(() => {
    const off = window.api.print.onPayload((p: PreviewPayload) => setData(p));
    window.api.print.ready();
    // Fallback so the route is visibly loaded even if IPC is slow
    const t = setTimeout(() => {
      if (!data) {
        const q = readQuery();
        if (q.templateId) {
          setData({
            template: { name: "Loading…" },
            cheques: [],
            offsets: { x: Number(q.ox ?? 0) || 0, y: Number(q.oy ?? 0) || 0 },
          });
        }
      }
    }, 300);
    return () => {
      off();
      clearTimeout(t);
    };
  }, []); // eslint-disable-line

  // Compute a preview zoom that fits the paper on screen (but never used for print)
  const paperPx = React.useMemo(() => {
    if (!data?.template) return { w: 0, h: 0 };
    const { width_mm, height_mm, dpi } = data.template;
    const mmToPx = (mm: number) => (mm / 25.4) * dpi;
    return { w: mmToPx(width_mm), h: mmToPx(height_mm) };
  }, [data?.template]);

  React.useEffect(() => {
    if (!paperPx.w || !paperPx.h) return;
    // leave a bit of padding around paper
    const pad = 48;
    const availW = Math.max(320, window.innerWidth - pad * 2);
    const availH = Math.max(240, window.innerHeight - pad * 2);
    const z = Math.min(availW / paperPx.w, availH / paperPx.h, 1); // never upscale in preview
    setZoom(z);
  }, [paperPx.w, paperPx.h]);

  const doPrint = async () => {
    // main will print the current sender (this preview window)
    await window.api.print.run(undefined as any);
  };

  return (
    <div
      style={{
        background: "#0f172a", // slate-900-ish
        minHeight: "100vh",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      {/* Screen toolbar (hidden in print) */}
      <div
        className="preview-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          color: "white",
          fontWeight: 600,
        }}
      >
        <div>
          Print Preview {data?.template?.name ? `— ${data.template.name}` : ""}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() =>
              setZoom((z) => Math.max(0.25, +(z - 0.1).toFixed(2)))
            }
          >
            −
          </button>
          <span style={{ minWidth: 56, textAlign: "center" }}>
            {(zoom * 100) | 0}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(1, +(z + 0.1).toFixed(2)))}
          >
            +
          </button>
          <button
            onClick={doPrint}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              background: "#2563eb",
              color: "white",
              fontWeight: 600,
            }}
          >
            Print
          </button>
        </div>
      </div>

      {/* Paper mat */}
      <div
        style={{
          display: "grid",
          placeItems: "center",
          height: "calc(100vh - 80px)",
        }}
      >
        <div
          id="preview-paper"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            width: `${paperPx.w}px`,
            height: `${paperPx.h}px`,
            boxShadow: "0 10px 25px rgba(0,0,0,.35), 0 3px 8px rgba(0,0,0,.35)",
            borderRadius: 12,
            overflow: "hidden",
            background: "white",
          }}
        >
          <React.Suspense fallback={null}>
            {data && (
              <PreviewCanvas
                template={data.template}
                cheques={data.cheques}
                offsets={data.offsets ?? { x: 0, y: 0 }}
              />
            )}
          </React.Suspense>
        </div>
      </div>

      {/* Print-only rules */}
      <style>{`
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
          }
          .preview-toolbar { display: none !important; }
          #preview-paper {
            /* IMPORTANT: 1:1 scale for print */
            transform: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            width: ${paperPx.w}px !important;
            height: ${paperPx.h}px !important;
            margin: 0 !important;
          }
          /* Only paper should be printable area */
          body > *:not(#preview-paper):not(.preview-toolbar) { display: none !important; }
          #preview-paper { display: block !important; }
        }
      `}</style>
    </div>
  );
}
