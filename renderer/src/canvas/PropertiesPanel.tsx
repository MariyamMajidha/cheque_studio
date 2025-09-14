// path: renderer/src/canvas/PropertiesPanel.tsx
import React from "react";
import { FIELD_OPTIONS, Field } from "../../../shared/constants";
import type { BoxNode } from "./DesignerStage";

type Props = {
  selected: BoxNode | null;
  onPatch: (patch: Partial<BoxNode>) => void;
};

const DATE_FORMATS = [
  { value: "DDMMYYYY", label: "DDMMYYYY" },
  { value: "MMDDYYYY", label: "MMDDYYYY" },
  { value: "YYYYMMDD", label: "YYYYMMDD" },
  { value: "DD-MM-YYYY", label: "DD-MM-YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "DD.MM.YYYY", label: "DD.MM.YYYY" },
];

export default function PropertiesPanel({ selected, onPatch }: Props) {
  if (!selected) {
    return (
      <aside className="w-72 border-l p-4 text-sm text-gray-500">
        Select a box to edit its properties.
      </aside>
    );
  }

  const isDate = selected.mapped_field === Field.Date;

  return (
    <aside className="w-72 border-l p-4 space-y-3 text-sm">
      <div className="font-medium text-gray-800">Properties</div>

      <label className="block">
        <span className="text-gray-600">Label</span>
        <input
          className="mt-1 w-full border rounded px-2 py-1"
          value={selected.label}
          onChange={(e) => onPatch({ label: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-gray-600">Mapped Field</span>
        <select
          className="mt-1 w-full border rounded px-2 py-1"
          value={selected.mapped_field || ""}
          onChange={(e) =>
            onPatch({
              mapped_field: (e.target.value || null) as any,
            })
          }
        >
          <option value="">— None —</option>
          {FIELD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {/* Extra controls when mapping Date */}
      {isDate && (
        <div className="rounded-md border p-2 space-y-2">
          <div className="text-gray-700 font-medium">Date mapping</div>

          <label className="block">
            <span className="text-gray-600">Format</span>
            <select
              className="mt-1 w-full border rounded px-2 py-1"
              value={selected.date_format || "DDMMYYYY"}
              onChange={(e) => onPatch({ date_format: e.target.value })}
            >
              {DATE_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-gray-600">
              Digit index <span className="text-xs text-gray-500">(0–7)</span>
            </span>
            <input
              type="number"
              min={0}
              max={7}
              className="mt-1 w-full border rounded px-2 py-1"
              value={
                Number.isFinite(selected.date_digit_index ?? -1)
                  ? selected.date_digit_index
                  : ""
              }
              placeholder="Leave blank to print full date"
              onChange={(e) => {
                const raw = e.target.value;
                onPatch({
                  date_digit_index:
                    raw === ""
                      ? undefined
                      : Math.max(0, Math.min(7, Number(raw))),
                });
              }}
            />
            <p className="mt-1 text-xs text-gray-500">
              Use one box per digit. For example create 8 boxes and set indexes
              0..7 to fill DDMMYYYY (or the format you select).
            </p>
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-gray-600">X (mm)</span>
          <input
            type="number"
            className="mt-1 w-full border rounded px-2 py-1"
            value={selected.x_mm}
            onChange={(e) => onPatch({ x_mm: Number(e.target.value) })}
          />
        </label>
        <label className="block">
          <span className="text-gray-600">Y (mm)</span>
          <input
            type="number"
            className="mt-1 w-full border rounded px-2 py-1"
            value={selected.y_mm}
            onChange={(e) => onPatch({ y_mm: Number(e.target.value) })}
          />
        </label>
        <label className="block">
          <span className="text-gray-600">W (mm)</span>
          <input
            type="number"
            className="mt-1 w-full border rounded px-2 py-1"
            value={selected.w_mm}
            onChange={(e) => onPatch({ w_mm: Number(e.target.value) })}
          />
        </label>
        <label className="block">
          <span className="text-gray-600">H (mm)</span>
          <input
            type="number"
            className="mt-1 w-full border rounded px-2 py-1"
            value={selected.h_mm}
            onChange={(e) => onPatch({ h_mm: Number(e.target.value) })}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-gray-600">Font size</span>
        <input
          type="number"
          className="mt-1 w-full border rounded px-2 py-1"
          value={selected.font_size ?? 12}
          onChange={(e) => onPatch({ font_size: Number(e.target.value) })}
        />
      </label>

      <label className="block">
        <span className="text-gray-600">Align</span>
        <select
          className="mt-1 w-full border rounded px-2 py-1"
          value={selected.align || "left"}
          onChange={(e) => onPatch({ align: e.target.value as any })}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </label>
    </aside>
  );
}
