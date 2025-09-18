import React from "react";
import { Stage, Layer, Rect, Text } from "react-konva";
import { mmToPx } from "../lib/units";
import { Field } from "@shared/constants";

type Props = {
  template: any;
  cheques: any[];
  offsets: { x: number; y: number };
};

// Allow parent to get a PNG snapshot
export type PreviewCanvasHandle = {
  toDataURL: (pixelRatio?: number) => string | undefined;
};

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
    default: {
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

function formatDateDigits(dateStr: string, order?: string): string {
  return formatDateFull(dateStr, order).replace(/\D/g, "");
}

function resolveBoxText(b: any, cheque: any, fallback: string): string {
  switch (b.mapped_field) {
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

const PreviewCanvas = React.forwardRef<PreviewCanvasHandle, Props>(
  ({ template, cheques, offsets }, ref) => {
    const stageRef = React.useRef<any>(null);

    React.useImperativeHandle(ref, () => ({
      toDataURL: (pixelRatio = 2) => {
        try {
          return stageRef.current?.toDataURL({
            pixelRatio,
            mimeType: "image/png",
          });
        } catch {
          return undefined;
        }
      },
    }));

    const w = mmToPx(template.width_mm, template.dpi);
    const h = mmToPx(template.height_mm, template.dpi);
    const ox = mmToPx(offsets.x, template.dpi);
    const oy = mmToPx(offsets.y, template.dpi);
    const cheque = cheques?.[0];

    return (
      <Stage ref={stageRef} width={w} height={h}>
        <Layer>
          <Rect x={0} y={0} width={w} height={h} fill="#ffffff" />
          {cheque &&
            (template._boxes ?? []).map((b: any) => (
              <Text
                key={b.id}
                x={mmToPx(b.x_mm, template.dpi) + ox}
                y={mmToPx(b.y_mm, template.dpi) + oy}
                width={mmToPx(b.w_mm, template.dpi)}
                height={mmToPx(b.h_mm, template.dpi)}
                text={resolveBoxText(b, cheque, b.label)}
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
);

export default PreviewCanvas;
