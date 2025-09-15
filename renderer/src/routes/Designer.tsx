// path: renderer/src/routes/Designer.tsx
import React, { useEffect, useMemo, useState } from "react";
import DesignerStage, { BoxNode } from "../canvas/DesignerStage";
import PropertiesPanel from "../canvas/PropertiesPanel";
import { useParams } from "@tanstack/react-router";

const DEFAULT_DPI = 150;
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function Designer() {
  const { templateId } = useParams({ from: "/designer/$templateId" as any });
  const tid = Number(templateId) || 1;

  const [paperWidthMm, setPaperWidthMm] = useState(210);
  const [paperHeightMm, setPaperHeightMm] = useState(99);
  const [dpi, setDpi] = useState(DEFAULT_DPI);
  const [zoom, setZoom] = useState(1);
  const [boxes, setBoxes] = useState<BoxNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Load boxes from DB
  useEffect(() => {
    (async () => {
      try {
        const rows = await window.api.boxes.list(tid);
        const mapped: BoxNode[] = rows.map((r: any) => ({
          id: String(r.id ?? uid()),
          label: r.label ?? "Field",
          mapped_field: (r.mapped_field as any) ?? null,
          x_mm: r.x_mm,
          y_mm: r.y_mm,
          w_mm: r.w_mm,
          h_mm: r.h_mm,
          rotation: r.rotation ?? 0,
          locked: !!r.locked,
          font_size: r.font_size ?? 12,
          align: (r.align as any) ?? "left",
          // ✅ hydrate date fields
          date_format: r.date_format ?? null,
          date_digit_index:
            typeof r.date_digit_index === "number" ? r.date_digit_index : null,
        }));
        setBoxes(mapped);
      } catch (e) {
        console.error("load boxes failed", e);
      }
    })();
  }, [tid]);

  // proxy to track selection from Stage
  const onStageChange = (next: BoxNode[]) => {
    setBoxes(next);
    if (selectedId && !next.find((b) => b.id === selectedId))
      setSelectedId(null);
  };

  const addBox = () => {
    setBoxes((b) => [
      ...b,
      {
        id: uid(),
        label: "Field",
        x_mm: 10,
        y_mm: 10,
        w_mm: 60,
        h_mm: 12,
        font_size: 12,
        align: "left",
        // ✅ init date fields
        date_format: null,
        date_digit_index: null,
      },
    ]);
  };

  const duplicate = () => {
    if (!selectedId) return;
    const src = boxes.find((b) => b.id === selectedId);
    if (!src) return;
    setBoxes((b) => [
      ...b,
      {
        ...src,
        id: uid(),
        x_mm: src.x_mm + 5,
        y_mm: src.y_mm + 5,
      },
    ]);
  };

  const clearAll = () => setBoxes([]);

  const save = async () => {
    await window.api.boxes.upsertMany(
      tid,
      boxes.map((b, idx) => ({
        template_id: tid,
        label: b.label,
        mapped_field: (b.mapped_field as any) ?? null,
        x_mm: b.x_mm,
        y_mm: b.y_mm,
        w_mm: b.w_mm,
        h_mm: b.h_mm,
        font_family: null,
        font_size: b.font_size ?? 12,
        bold: 0,
        italic: 0,
        align: (b.align as any) ?? "left",
        uppercase: 0,
        letter_spacing: null,
        line_height: null,
        color: "#000000",
        rotation: b.rotation ?? 0,
        locked: b.locked ? 1 : 0,
        z_index: idx,
        // ✅ persist date fields
        date_format: b.date_format ?? null,
        date_digit_index:
          typeof b.date_digit_index === "number" ? b.date_digit_index : null,
      }))
    );
    alert("Saved!");
  };

  const zoomPct = useMemo(() => Math.round(zoom * 100), [zoom]);
  const selected = selectedId
    ? (boxes.find((b) => b.id === selectedId) ?? null)
    : null;

  const onPatch = (patch: Partial<BoxNode>) => {
    if (!selectedId) return;
    setBoxes((bs) =>
      bs.map((b) => (b.id === selectedId ? { ...b, ...patch } : b))
    );
  };

  return (
    <div className="h-full flex">
      <main className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Designer — Template {tid}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Zoom</span>
              <input
                type="range"
                min={0.25}
                max={4}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
              />
              <span className="text-sm w-10 text-right">{zoomPct}%</span>
            </div>
            <button
              onClick={save}
              className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Save
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={addBox}
            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + Add Box
          </button>
          <button
            onClick={duplicate}
            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
          >
            Duplicate
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>

        <div className="flex">
          <div className="flex-1 pr-4" onClick={() => setSelectedId(null)}>
            <DesignerStage
              dpi={dpi}
              paperWidthMm={paperWidthMm}
              paperHeightMm={paperHeightMm}
              zoom={zoom}
              boxes={boxes}
              onChange={(next) => setBoxes(next)}
            />
          </div>

          <PropertiesPanel selected={selected} onPatch={onPatch} />
        </div>
      </main>
    </div>
  );
}
