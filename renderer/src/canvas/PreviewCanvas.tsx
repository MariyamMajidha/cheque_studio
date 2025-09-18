import React from "react";
import { Stage, Layer, Rect, Text } from "react-konva";
import { Field } from "../../../shared/constants";

/** mm → px at a given DPI */
const mmToPx = (mm: number, dpi: number) => (mm / 25.4) * dpi;

/** Be tolerant of older/variant field strings coming from DB. */
function normalizeField(v: unknown): Field | null {
  if (v === null || v === undefined) return null;
  const s = String(v).toLowerCase().trim();
  // Known canonical names (keep in sync with shared/constants)
  if (s === String(Field.PayeeName).toLowerCase()) return Field.PayeeName;
  if (s === String(Field.AmountWords).toLowerCase()) return Field.AmountWords;
  if (s === String(Field.AmountNumeric).toLowerCase())
    return Field.AmountNumeric;
  if (s === String(Field.Date).toLowerCase()) return Field.Date;

  // Legacy fallbacks commonly seen
  if (["payee", "name", "payee_name"].includes(s)) return Field.PayeeName;
  if (["amount_words", "amountinwords", "words"].includes(s))
    return Field.AmountWords;
  if (["amount", "amount_numeric", "num", "numeric"].includes(s))
    return Field.AmountNumeric;
  if (["date", "cheque_date", "dt"].includes(s)) return Field.Date;

  return null;
}

/** Parse common date inputs */
function parseLooseDate(s: string): Date | null {
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/); // yyyy-MM-dd
  if (m) {
    const [_, y, mo, d] = m.map(Number);
    const dt = new Date(y, mo - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/); // dd-MM-yyyy
  if (m) {
    const [_, d, mo, y] = m.map(Number);
    const dt = new Date(y, mo - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

/** Format a full date string respecting simple patterns (incl. separators) */
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
      const sep = fmt.includes("-")
        ? "-"
        : fmt.includes("/")
          ? "/"
          : fmt.includes(".")
            ? "."
            : "";
      if (!sep) return `${DD}${MM}${YYYY}`;
      const parts = fmt
        .split(sep)
        .map((p) => (p.startsWith("Y") ? YYYY : p.startsWith("M") ? MM : DD));
      return parts.join(sep);
    }
  }
}
const formatDateDigits = (s: string, order?: string) =>
  formatDateFull(s, order).replace(/\D/g, "");

function resolveBoxText(box: any, cheque: any, fallback: string): string {
  const kind = normalizeField(box.mapped_field);

  switch (kind) {
    case Field.PayeeName:
      return cheque?.payee ?? "";

    case Field.AmountWords:
      return cheque?.amount_words ?? "";

    case Field.AmountNumeric: {
      const n = Number(cheque?.amount);
      if (!isFinite(n)) return "";
      return n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    case Field.Date: {
      const fmt = box.date_format || "DDMMYYYY";
      const idx = box.date_digit_index;
      if (typeof idx === "number" && idx >= 0) {
        const digits = formatDateDigits(cheque?.date ?? "", fmt);
        return digits[idx] ?? "";
      }
      return formatDateFull(cheque?.date ?? "", fmt);
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
  const dpi = template.dpi;
  const W = mmToPx(template.width_mm, dpi);
  const H = mmToPx(template.height_mm, dpi);
  const ox = mmToPx(offsets.x, dpi);
  const oy = mmToPx(offsets.y, dpi);

  const cheque = cheques?.[0] ?? null;

  return (
    <Stage
      width={W}
      height={H}
      listening={false}
      pixelRatio={2} // crisper text on print/retina
    >
      <Layer>
        {/* Paper */}
        <Rect x={0} y={0} width={W} height={H} fill="#ffffff" />

        {/* Draw only text (no design boxes) */}
        {cheque &&
          (template._boxes ?? []).map((b: any) => (
            <Text
              key={b.id}
              x={mmToPx(b.x_mm, dpi) + ox}
              y={mmToPx(b.y_mm, dpi) + oy}
              width={mmToPx(b.w_mm, dpi)}
              height={mmToPx(b.h_mm, dpi)}
              text={resolveBoxText(b, cheque, "")}
              align={(b.align as "left" | "center" | "right") || "left"}
              fontFamily={b.font_family || undefined}
              fontStyle={
                [b.bold ? "bold" : "", b.italic ? "italic" : ""]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              fontSize={b.font_size || 12}
              fill={b.color || "#000"}
            />
          ))}
      </Layer>
    </Stage>
  );
}
