// path: renderer/src/canvas/PreviewCanvas.tsx
import React from "react";
import { Stage, Layer, Rect, Text } from "react-konva";
import Konva from "konva";
import { mmToPx } from "../lib/units";
import { Field } from "../../../shared/constants";

type Box = any;
type Cheque = any;

function parseLooseDate(s: string): Date | null {
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const [_, y, mo, d] = m.map(Number);
    const dt = new Date(y, mo - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [_, d, mo, y] = m.map(Number);
    const dt = new Date(y, mo - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

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
    default:
      return `${DD}${MM}${YYYY}`;
  }
}
function formatDateDigits(dateStr: string, order?: string): string {
  return formatDateFull(dateStr, order).replace(/\D/g, "");
}

/** Measure text width using Konva's own Text node for perfect parity with render. */
function makeKonvaMeasurer(base: {
  bold?: boolean;
  italic?: boolean;
  size: number;
  family?: string;
  letterSpacing?: number;
}) {
  const fontStyle =
    `${base.bold ? "bold " : ""}${base.italic ? "italic " : ""}`.trim();
  const family = base.family || "system-ui,sans-serif";
  const size = base.size || 12;
  const ls = base.letterSpacing || 0;

  return (text: string) => {
    const node = new Konva.Text({
      text,
      fontSize: size,
      fontFamily: family,
      fontStyle: fontStyle || undefined,
      letterSpacing: ls,
      wrap: "none",
    });
    const w = node.getTextWidth();
    node.destroy();
    return w;
  };
}

/** One-line fit: returns [lineThatFits, remainingText] */
function takeLineFitting(
  text: string,
  widthPx: number,
  measure: (s: string) => number
): [string, string] {
  const words = text.trim().split(/\s+/);
  let line = "";
  let i = 0;

  while (i < words.length) {
    const probe = (line ? line + " " : "") + words[i];
    if (measure(probe) <= widthPx) {
      line = probe;
      i++;
    } else {
      if (!line) {
        // hard-break a single too-long word
        let lo = 0,
          hi = words[i].length;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          if (measure(words[i].slice(0, mid)) <= widthPx) lo = mid;
          else hi = mid - 1;
        }
        const fit = words[i].slice(0, lo);
        const rest = [words[i].slice(lo), ...words.slice(i + 1)].join(" ");
        return [fit, rest.trim()];
      }
      break;
    }
  }
  return [line, words.slice(i).join(" ").trim()];
}

/** Flow text across all AmountWords boxes (top→bottom then left→right). */
function computeAmountFlows(
  allBoxes: Box[],
  templateDpi: number,
  cheque: Cheque
): Record<string, string> {
  const boxes = allBoxes.filter((b) => b.mapped_field === Field.AmountWords);
  if (!boxes.length) return {};

  const sorted = boxes
    .slice()
    .sort((a, b) => a.y_mm - b.y_mm || a.x_mm - b.x_mm);
  const out: Record<string, string> = {};
  let remaining = (cheque.amount_words || "").trim();

  for (const b of sorted) {
    const widthPx = mmToPx(b.w_mm, templateDpi);

    const measure = makeKonvaMeasurer({
      bold: !!b.bold,
      italic: !!b.italic,
      size: b.font_size || 12,
      family: b.font_family || "system-ui,sans-serif",
      letterSpacing: b.letter_spacing || 0,
    });

    const [line, rest] = takeLineFitting(remaining, widthPx, measure);
    out[b.id] = b.uppercase ? line.toUpperCase() : line;
    remaining = rest;
    if (!remaining) break;
  }
  return out;
}

function resolveBoxText(
  b: any,
  cheque: any,
  fallback: string,
  amountMap: Record<string, string>
): string {
  switch (b.mapped_field) {
    case Field.PayeeName:
      return cheque.payee ?? "";
    case Field.AmountWords:
      return amountMap[b.id] ?? "";
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
      if (typeof idx === "number" && idx >= 0) {
        const digits = formatDateDigits(cheque.date ?? "", fmt);
        return digits[idx] ?? "";
      }
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
  const boxes: Box[] = (template._boxes ?? template.boxes ?? []) as Box[];

  const w = mmToPx(template.width_mm, template.dpi);
  const h = mmToPx(template.height_mm, template.dpi);
  const ox = mmToPx(offsets.x, template.dpi);
  const oy = mmToPx(offsets.y, template.dpi);

  const cheque = cheques?.[0];
  const amountFlows = cheque
    ? computeAmountFlows(boxes, template.dpi, cheque)
    : {};

  return (
    <Stage width={w} height={h}>
      <Layer>
        <Rect x={0} y={0} width={w} height={h} fill="#fff" />
        {cheque &&
          boxes.map((b: any) => (
            <Text
              key={b.id}
              x={mmToPx(b.x_mm, template.dpi) + ox}
              y={mmToPx(b.y_mm, template.dpi) + oy}
              width={mmToPx(b.w_mm, template.dpi)}
              height={mmToPx(b.h_mm, template.dpi)}
              wrap="none" // one line per box
              text={resolveBoxText(b, cheque, b.label, amountFlows)}
              align={b.align || "left"}
              fontFamily={b.font_family || "system-ui,sans-serif"}
              letterSpacing={b.letter_spacing || 0}
              fontStyle={
                `${b.bold ? "bold" : ""} ${b.italic ? "italic" : ""}`.trim() ||
                undefined
              }
              fontSize={b.font_size || 12}
              fill={b.color || "#000"}
              listening={false}
            />
          ))}
      </Layer>
    </Stage>
  );
}
