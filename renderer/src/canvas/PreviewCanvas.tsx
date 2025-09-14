// path: renderer/src/canvas/PreviewCanvas.tsx
import React from "react";
import { Stage, Layer, Rect, Text } from "react-konva";
import { mmToPx } from "../lib/units";
import { Field } from "@shared/constants";

/**
 * Try to parse a date string users might type (dd-MM-yyyy, dd/MM/yyyy, yyyy-MM-dd, etc.)
 * Returns a real Date or null.
 */
function parseLooseDate(s: string): Date | null {
  if (!s) return null;

  // yyyy-MM-dd (or yyyy/MM/dd)
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const [_, y, mo, d] = m.map(Number);
    const dt = new Date(y, mo - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // dd-MM-yyyy (or dd/MM/yyyy)
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [_, d, mo, y] = m.map(Number);
    const dt = new Date(y, mo - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // As a last resort, let Date try (works for some locales, ISO, etc.)
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

/**
 * Produce a continuous string of digits for the given order, e.g.:
 * order "DDMMYYYY" -> "25092012"
 * order "MMDDYYYY" -> "09252012"
 * Defaults to DDMMYYYY if order not recognized.
 */
function formatDateDigits(dateStr: string, order?: string): string {
  const dt = parseLooseDate(dateStr);
  if (!dt) return "";

  const d = dt.getDate(); // 1..31
  const m = dt.getMonth() + 1; // 1..12
  const y = dt.getFullYear(); // 4-digit

  const DD = d.toString().padStart(2, "0");
  const MM = m.toString().padStart(2, "0");
  const YYYY = y.toString().padStart(4, "0");

  const ord = (order || "DDMMYYYY").toUpperCase();

  switch (ord) {
    case "DDMMYYYY":
      return `${DD}${MM}${YYYY}`;
    case "MMDDYYYY":
      return `${MM}${DD}${YYYY}`;
    case "YYYYMMDD":
      return `${YYYY}${MM}${DD}`;
    case "YYYYDDMM":
      return `${YYYY}${DD}${MM}`;
    default:
      // Unknown pattern -> default to DDMMYYYY
      return `${DD}${MM}${YYYY}`;
  }
}

/**
 * Resolve the text to render for a box, supporting per-digit date boxes.
 */
function resolveBoxText(b: any, cheque: any, fallback: string): string {
  const field = b.mapped_field;

  switch (field) {
    case Field.PayeeName:
      return cheque.payee ?? "";

    case Field.AmountWords:
      return cheque.amount_words ?? "";

    case Field.AmountNumeric:
      return cheque.amount != null ? String(cheque.amount) : "";

    case Field.Date: {
      // If the box carries date digit mapping info, render a single digit.
      // Expected metadata (optional): b.date_format: "DDMMYYYY" | "MMDDYYYY" | ...
      //                               b.date_digit_index: number (0-based)
      const hasDigit =
        typeof (b as any).date_digit_index === "number" &&
        (b as any).date_digit_index >= 0;

      if (hasDigit) {
        const order = (b as any).date_format || "DDMMYYYY";
        const digits = formatDateDigits(cheque.date ?? "", order);
        const idx = Number((b as any).date_digit_index) || 0;
        return digits[idx] ?? "";
      }

      // Fallback: render full date as provided
      return cheque.date ?? "";
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
