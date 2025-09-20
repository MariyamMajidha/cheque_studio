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

  // Bitmap we’ll print
  const [printBitmap, setPrintBitmap] = React.useState<string | null>(null);
  // Ask the canvas to re-capture before printing
  const [captureTick, setCaptureTick] = React.useState(0);

  // ---- Receive payload from main ----
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Paper size in px (screen & print) ----
  const paperPx = React.useMemo(() => {
    if (!data?.template) return { w: 0, h: 0 };
    const { width_mm, height_mm, dpi } = data.template;
    const mmToPx = (mm: number) => (mm / 25.4) * dpi;
    return { w: mmToPx(width_mm), h: mmToPx(height_mm) };
  }, [data?.template]);

  // Fit paper on screen (never upscale)
  React.useEffect(() => {
    if (!paperPx.w || !paperPx.h) return;
    const pad = 48;
    const availW = Math.max(320, window.innerWidth - pad * 2);
    const availH = Math.max(240, window.innerHeight - pad * 2);
    const z = Math.min(availW / paperPx.w, availH / paperPx.h, 1);
    setZoom(z);
  }, [paperPx.w, paperPx.h]);

  // ---- Print-only DOM portal (outside our layout) ----
  React.useEffect(() => {
    let holder = document.getElementById("print-only");
    if (!holder) {
      holder = document.createElement("div");
      holder.id = "print-only";
      holder.style.display = "none"; // hidden on screen
      document.body.appendChild(holder);
    }
    // ensure it contains an <img>
    let img = holder.querySelector("img") as HTMLImageElement | null;
    if (!img) {
      img = document.createElement("img");
      img.id = "print-only-img";
      img.style.display = "none";
      img.alt = "";
      holder.appendChild(img);
    }
    // keep size in sync
    img.style.width = `${paperPx.w}px`;
    img.style.height = `${paperPx.h}px`;
    // keep bitmap in sync
    if (printBitmap) img.src = printBitmap;
    return () => {
      // don’t remove between renders; we keep the node attached to body
    };
  }, [printBitmap, paperPx.w, paperPx.h]);

  const doPrint = async () => {
    // 1) ask the Konva stage to capture to PNG
    setCaptureTick((t) => t + 1);
    // 2) wait a moment for the bitmap to refresh
    await new Promise((r) => setTimeout(r, 80));
    await new Promise(requestAnimationFrame);
    // 3) trigger OS print of THIS window
    window.api.print.runCurrent();
  };

  return (
    <div
      id="screen-shell"
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

      {/* Paper mat (screen only) */}
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
          {/* Live interactive canvas for screen */}
          <div id="preview-paper-canvas">
            <React.Suspense fallback={null}>
              {data && (
                <PreviewCanvas
                  template={data.template}
                  cheques={data.cheques}
                  offsets={data.offsets ?? { x: 0, y: 0 }}
                  onBitmapChange={setPrintBitmap} // capture PNG
                  captureTick={captureTick} // recapture before print
                />
              )}
            </React.Suspense>
          </div>
        </div>
      </div>

      {/* Print stylesheet: hide UI and show only the top-level <img/> in #print-only */}
      <style>{`
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
          }

          /* Hide all screen UI completely */
          #screen-shell { display: none !important; }

          /* Show the print-only portal (attached to <body>) */
          #print-only { 
            display: block !important; 
            margin: 0 !important;
            padding: 0 !important;
          }
          #print-only-img {
            display: block !important;
            width: ${paperPx.w}px !important;
            height: ${paperPx.h}px !important;
          }
        }
      `}</style>
    </div>
  );
}
