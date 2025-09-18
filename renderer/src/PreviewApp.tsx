import React from "react";
import PrintPreview from "./routes/PrintPreview";

/**
 * Standalone preview app (no sidebar, no router).
 * Loaded only in preview.html entry point.
 */
export default function PreviewApp() {
  return (
    <div className="w-full h-full">
      <PrintPreview />
    </div>
  );
}
