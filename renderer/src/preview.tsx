// path: renderer/src/preview.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import PrintPreview from "./routes/PrintPreview";

const rootEl = document.getElementById("root")!;
createRoot(rootEl).render(
  <React.StrictMode>
    {/* NO app shell / sidebar here */}
    <PrintPreview />
  </React.StrictMode>
);
