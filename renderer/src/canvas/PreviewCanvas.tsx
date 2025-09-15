// path: renderer/src/canvas/PreviewCanvas.tsx
import React from "react";
import { Stage, Layer, Rect, Text } from "react-konva";
import { mmToPx } from "../lib/units";
import { Field } from "../../../shared/constants";

/** Parse common date inputs: dd-MM-yyyy, dd/MM/yyyy, yyyy-MM-dd, etc. */
function parseLooseDate(s: string): Date | null {
  if (!s) return null;

  // yyyy-MM-dd or yyyy/MM/dd
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const y = Number(m[1]),
      mo = Number(m[2]),
      d = Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // dd-MM-yyyy or dd/MM/yyyy
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const d = Number(m[1]),
      mo = Number(m[2]),
      y = Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // Fallback
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

/** Render full date string per a format like DDMMYYYY, MMDDYYYY, YYYYMMDD, DD-MM-YYYY, etc. */
function formatDateFull(dateStr: string, fmt: string = "DDMMYYYY"): string {
  const dt = parseLooseDate(dateStr);
  if (!dt) return "";

  const DD = String(dt.getDate()).padStart(2, "0");
  const MM = String(dt.getMonth() + 1).padStart(2, "0");
  const YYYY = String(dt.getFullYear());

  switch (fmt) {
    case "DDMMYYYY":
      return `${DD}${MM}${YYYY}`;
    case "MMDDYYYY":
      return `${MM}${DD}${YYYY}`;
    case "YYYYMMDD":
      return `${YYYY}${MM}${DD}`;
    case "YYYYDDMM":
      return `${YYYY}${DD}${MM}`;
    case "DD-MM-YYYY":
      return `${DD}-${MM}-${YYYY}`;
    case "DD/MM/YYYY":
      return `${DD}/${MM}/${YYYY}`;
    case "DD.MM.YYYY":
      return `${DD}.${MM}.${YYYY}`;
    default: {
      // Try to honor custom separators/order crudely
      const sep = fmt.includes("-")
        ? "-"
        : fmt.includes("/")
          ? "/"
          : fmt.includes(".")
            ? "."
            : "";
      if (sep) {
        const parts = fmt
          .split(sep)
          .map((t) => (t.startsWith("Y") ? YYYY : t.startsWith("M") ? MM : DD));
        return parts.join(sep);
      }
      return `${DD}${MM}${YYYY}`;
    }
  }
}

/** Produce a continuous digits-only string for digit slicing */
function formatDateDigits(dateStr: string, order?: string): string {
  return formatDateFull(dateStr, order).replace(/\D/g, "");
}

/** Resolve the text to render for a box, with per-digit date support. */
function resolveBoxText(b: any, cheque: any, fallback: string): string {
  const field = b.mapped_field;

  switch (field) {
    case Field.PayeeName:
      return cheque.payee ?? "";

    case Field.AmountWords:
      return cheque.amount_words ?? "";

    case Field.AmountNumeric: {
      const n = Number(cheque.amount);
      return isFinite(n)
        ? n.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "";
    }

    case Field.Date: {
      const idx = (b as any).date_digit_index;
      const fmt = (b as any).date_format || "DDMMYYYY";

      // If a digit index is provided, return just that digit (0–7)
      if (typeof idx === "number" && idx >= 0) {
        const digits = formatDateDigits(cheque.date ?? "", fmt);
        return digits[idx] ?? "";
      }

      // Otherwise, return the full formatted date
      return formatDateFull(cheque.date ?? "", fmt);
    }

    default:
      return fallback ?? "";
  }
}

export default function PreviewCanvas({
  template,
  cheques,
  offsets,
}: {
  template: any;
  cheques: any[];
  offsets: { x: number; y: number };
}) {
  const w = mmToPx(template.width_mm, template.dpi);
  const h = mmToPx(template.height_mm, template.dpi);
  const ox = mmToPx(offsets.x, template.dpi);
  const oy = mmToPx(offsets.y, template.dpi);

  const firstCheque = cheques?.[0];

  return (
    <Stage width={w} height={h}>
      <Layer>
        <Rect x={0} y={0} width={w} height={h} fill="#fff" />
        {firstCheque &&
          (template._boxes ?? []).map((b: any) => (
            <Text
              key={b.id}
              x={mmToPx(b.x_mm, template.dpi) + ox}
              y={mmToPx(b.y_mm, template.dpi) + oy}
              width={mmToPx(b.w_mm, template.dpi)}
              height={mmToPx(b.h_mm, template.dpi)}
              text={resolveBoxText(b, firstCheque, b.label)}
              align={b.align || "left"}
              fontFamily={b.font_family || undefined}
              fontStyle={
                `${b.bold ? "bold" : ""} ${b.italic ? "italic" : ""}`.trim() ||
                undefined
              }
              fontSize={b.font_size || 12}
              fill={b.color || "#000"}
            />
          ))}
      </Layer>
    </Stage>
  );
}
