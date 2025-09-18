// Standalone entry for /preview.html
import React from "react";
import { createRoot } from "react-dom/client";
import PrintPreview from "../routes/PrintPreview";

const el = document.getElementById("root")!;
createRoot(el).render(
  <React.StrictMode>
    <PrintPreview />
  </React.StrictMode>
);
