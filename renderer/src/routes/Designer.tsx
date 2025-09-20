import React, { useEffect, useMemo, useState } from "react";
import DesignerStage, { BoxNode } from "../canvas/DesignerStage";
import { useParams } from "@tanstack/react-router";

const DEFAULT_DPI = 150;
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function Designer() {
  const { templateId } = useParams({ from: "/designer/$templateId" as any });
  const tid = Number(templateId) || 1;

  const [paperWidthMm] = useState(210);
  const [paperHeightMm] = useState(99);
  const [dpi] = useState(DEFAULT_DPI);

  // Zoom as a percentage 10–100
  const [zoomPct, setZoomPct] = useState(100);
  const zoom = useMemo(
    () => Math.max(10, Math.min(100, zoomPct)) / 100,
    [zoomPct]
  );

  const [boxes, setBoxes] = useState<BoxNode[]>([]);

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
        date_format: null,
        date_digit_index: null,
      },
    ]);
  };

  const duplicate = () => {
    // Let the stage handle selection & properties; just duplicate the last box
    if (!boxes.length) return;
    const src = boxes[boxes.length - 1];
    setBoxes((b) => [
      ...b,
      { ...src, id: uid(), x_mm: src.x_mm + 5, y_mm: src.y_mm + 5 },
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
        date_format: b.date_format ?? null,
        date_digit_index:
          typeof b.date_digit_index === "number" ? b.date_digit_index : null,
      }))
    );
    alert("Saved!");
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
                min={10}
                max={100}
                step={5}
                value={zoomPct}
                onChange={(e) => setZoomPct(Number(e.target.value))}
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

        {/* Use DesignerStage with its own built-in Properties panel.
            Removing the extra <PropertiesPanel /> avoids duplication. */}
        <DesignerStage
          dpi={dpi}
          paperWidthMm={paperWidthMm}
          paperHeightMm={paperHeightMm}
          zoom={zoom}
          boxes={boxes}
          onChange={setBoxes}
          // hideSidePanel // <- leave commented so the internal panel is visible
        />
      </main>
    </div>
  );
}
