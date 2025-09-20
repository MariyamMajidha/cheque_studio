import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Transformer,
  Text as KText,
  Image as KImage,
} from "react-konva";
import { mmToPx } from "../lib/units";
import { Field } from "../../../shared/constants";
import PropertiesPanel from "./PropertiesPanel";

export type BoxNode = {
  id: string;
  label: string;
  mapped_field?: Field | "" | null;

  x_mm: number;
  y_mm: number;
  w_mm: number;
  h_mm: number;

  rotation?: number;
  locked?: boolean;
  font_size?: number;

  date_format?: string | null;
  date_digit_index?: number | null;

  align?: "left" | "center" | "right";
};

type Props = {
  dpi: number;
  paperWidthMm: number;
  paperHeightMm: number;
  zoom: number;
  boxes: BoxNode[];
  onChange(boxes: BoxNode[]): void;

  /** Show a scanned cheque as background in the designer only. */
  backgroundUrl?: string | null;

  /** Hide the built-in side panel (if page renders its own). */
  hideSidePanel?: boolean;
};

export default function DesignerStage({
  dpi,
  paperWidthMm,
  paperHeightMm,
  zoom,
  boxes,
  onChange,
  backgroundUrl,
  hideSidePanel = false,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const trRef = useRef<any>(null);

  // load background image (if any)
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!backgroundUrl) {
      setBgImg(null);
      return;
    }
    const img = new window.Image();
    // allow file://
    img.onload = () => setBgImg(img);
    img.onerror = () => setBgImg(null);
    img.src = backgroundUrl;
  }, [backgroundUrl]);

  const stageSize = useMemo(
    () => ({
      width: mmToPx(paperWidthMm, dpi) * zoom,
      height: mmToPx(paperHeightMm, dpi) * zoom,
    }),
    [paperWidthMm, paperHeightMm, dpi, zoom]
  );

  // Amount (words) order map (top→bottom then left→right)
  const awOrder = useMemo(() => {
    const aw = boxes
      .filter((b) => b.mapped_field === (Field as any).AmountWords)
      .slice()
      .sort((a, b) => a.y_mm - b.y_mm || a.x_mm - b.x_mm);
    const map = new Map<string, number>();
    aw.forEach((b, i) => map.set(b.id, i + 1));
    return map;
  }, [boxes]);

  // focus transformer on selection
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = tr.getStage()?.findOne(`#${selectedId}`);
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedId, boxes]);

  // keyboard delete
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Backspace" || e.key === "Delete") && selectedId) {
        onChange(boxes.filter((b) => b.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [boxes, selectedId, onChange]);

  const selectedBox = boxes.find((b) => b.id === selectedId) ?? null;

  const patchSelected = (patch: Partial<BoxNode>) => {
    if (!selectedId) return;
    onChange(boxes.map((b) => (b.id === selectedId ? { ...b, ...patch } : b)));
  };

  const pageW = mmToPx(paperWidthMm, dpi);
  const pageH = mmToPx(paperHeightMm, dpi);

  return (
    <div className="flex border rounded bg-white shadow-sm">
      <div className="flex-1">
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          scale={{ x: zoom, y: zoom }}
          className="bg-[repeating-linear-gradient(0deg,transparent,transparent_19px,#f3f4f6_20px),repeating-linear-gradient(90deg,transparent,transparent_19px,#f3f4f6_20px)]"
          onMouseDown={(e) => {
            const clickedEmpty = e.target === e.target.getStage();
            if (clickedEmpty) setSelectedId(null);
          }}
        >
          <Layer>
            {/* 0) Optional scanned cheque background */}
            {bgImg && (
              <KImage
                image={bgImg}
                x={0}
                y={0}
                width={pageW}
                height={pageH}
                listening={false} // clicks pass through
              />
            )}

            {/* 1) Page border (no fill so background remains visible) */}
            <Rect
              x={0}
              y={0}
              width={pageW}
              height={pageH}
              stroke="#e5e7eb"
              strokeWidth={1}
            />

            {/* 2) Boxes */}
            {boxes.map((b) => {
              const x = mmToPx(b.x_mm, dpi);
              const y = mmToPx(b.y_mm, dpi);
              const w = mmToPx(b.w_mm, dpi);
              const h = mmToPx(b.h_mm, dpi);
              const badge = awOrder.get(b.id);

              return (
                <React.Fragment key={b.id}>
                  <Rect
                    id={b.id}
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rotation={b.rotation || 0}
                    fill="rgba(37,99,235,0.06)"
                    stroke={selectedId === b.id ? "#2563eb" : "#9ca3af"}
                    dash={selectedId === b.id ? [4, 4] : []}
                    draggable={!b.locked}
                    onClick={() => setSelectedId(b.id)}
                    onDragEnd={(e) => {
                      const nx = e.target.x();
                      const ny = e.target.y();
                      onChange(
                        boxes.map((bb) =>
                          bb.id === b.id
                            ? {
                                ...bb,
                                x_mm: +(nx / (dpi / 25.4)).toFixed(2),
                                y_mm: +(ny / (dpi / 25.4)).toFixed(2),
                              }
                            : bb
                        )
                      );
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const scaleX = node.scaleX();
                      const scaleY = node.scaleY();
                      node.scaleX(1);
                      node.scaleY(1);
                      const nw = Math.max(4, node.width() * scaleX);
                      const nh = Math.max(3, node.height() * scaleY);
                      onChange(
                        boxes.map((bb) =>
                          bb.id === b.id
                            ? {
                                ...bb,
                                x_mm: +(node.x() / (dpi / 25.4)).toFixed(2),
                                y_mm: +(node.y() / (dpi / 25.4)).toFixed(2),
                                w_mm: +(nw / (dpi / 25.4)).toFixed(2),
                                h_mm: +(nh / (dpi / 25.4)).toFixed(2),
                                rotation: node.rotation(),
                              }
                            : bb
                        )
                      );
                    }}
                  />
                  {typeof badge === "number" && (
                    <KText
                      x={x + 4}
                      y={y + 2}
                      text={`AW${badge}`}
                      fontSize={11}
                      fill="#334155"
                    />
                  )}
                </React.Fragment>
              );
            })}

            <Transformer
              ref={trRef}
              rotateEnabled
              flipEnabled={false}
              enabledAnchors={[
                "top-left",
                "top-right",
                "bottom-left",
                "bottom-right",
                "middle-left",
                "middle-right",
                "top-center",
                "bottom-center",
              ]}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 10 || newBox.height < 8) return oldBox;
                return newBox;
              }}
            />
          </Layer>
        </Stage>

        <p className="text-xs text-gray-500 mt-2">
          Tip: click a box to select, drag to move, resize with handles, rotate
          with the transformer, press Delete to remove.
        </p>
      </div>

      {!hideSidePanel && (
        <PropertiesPanel
          selected={boxes.find((b) => b.id === selectedId) ?? null}
          onPatch={(patch) => {
            if (!selectedId) return;
            onChange(
              boxes.map((b) => (b.id === selectedId ? { ...b, ...patch } : b))
            );
          }}
        />
      )}
    </div>
  );
}
