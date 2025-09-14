// path: renderer/src/canvas/Ruler.tsx
import React from "react";

export default function Ruler({ orientation, lengthPx }: { orientation: "horizontal" | "vertical"; lengthPx: number }) {
  const ticks = [];
  for (let i = 0; i <= lengthPx; i += 5) {
    const big = i % 10 === 0;
    ticks.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: orientation === "horizontal" ? `${i}px` : 0,
          top: orientation === "vertical" ? `${i}px` : 0,
          width: orientation === "horizontal" ? "1px" : "20px",
          height: orientation === "horizontal" ? (big ? "20px" : "10px") : "1px",
          background: "#999"
        }}
      />
    );
  }

  return (
    <div
      className="relative bg-gray-100"
      style={{
        height: orientation === "horizontal" ? 20 : lengthPx + 20,
        width: orientation === "horizontal" ? lengthPx + 20 : 20
      }}
    />
  );
}
