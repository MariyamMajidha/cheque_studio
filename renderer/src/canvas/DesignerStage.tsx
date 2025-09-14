import React, { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Transformer } from "react-konva";
import { mmToPx } from "../lib/units";
import type { Field } from "../../../shared/constants";
import PropertiesPanel from "./PropertiesPanel";

export type BoxNode = {
  id: string;
  label: string;
  mapped_field?: Field | null;
  x_mm: number;
  y_mm: number;
  w_mm: number;
  h_mm: number;
  rotation?: number;
  locked?: boolean;
  font_size?: number;
  date_format?: string;
  date_digit_index?: number;
  align?: "left" | "center" | "right";
};

type Props = {
  dpi: number;
  paperWidthMm: number;
  paperHeightMm: number;
  zoom: number;
  boxes: BoxNode[];
  onChange(boxes: BoxNode[]): void;
};

export default function DesignerStage({
  dpi,
  paperWidthMm,
  paperHeightMm,
  zoom,
  boxes,
  onChange,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const trRef = useRef<any>(null);

  const stageSize = useMemo(() => {
    return {
      width: mmToPx(paperWidthMm, dpi) * zoom,
      height: mmToPx(paperHeightMm, dpi) * zoom,
    };
  }, [paperWidthMm, paperHeightMm, dpi, zoom]);

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

  return (
    <div className="flex border rounded bg-white shadow-sm">
      <div className="flex-1">
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          scale={{ x: zoom, y: zoom }}
          className="bg-[repeating-linear-gradient(0deg,transparent,transparent_19px,#f3f4f6_20px),repeating-linear-gradient(90deg,transparent,transparent_19px,#f3f4f6_20px)]"
          onMouseDown={(e) => {
            // deselect when clicking empty
            const clickedEmpty = e.target === e.target.getStage();
            if (clickedEmpty) setSelectedId(null);
          }}
        >
          <Layer>
            {/* page border */}
            <Rect
              x={0}
              y={0}
              width={mmToPx(paperWidthMm, dpi)}
              height={mmToPx(paperHeightMm, dpi)}
              stroke="#e5e7eb"
              strokeWidth={1}
            />

            {boxes.map((b) => {
              const x = mmToPx(b.x_mm, dpi);
              const y = mmToPx(b.y_mm, dpi);
              const w = mmToPx(b.w_mm, dpi);
              const h = mmToPx(b.h_mm, dpi);
              return (
                <Rect
                  key={b.id}
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
                if (newBox.width < 10 || newBox.height < 8) {
                  return oldBox;
                }
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

      {/* Properties side panel */}
      <PropertiesPanel selected={selectedBox} onPatch={patchSelected} />
    </div>
  );
}
