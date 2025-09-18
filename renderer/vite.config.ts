// path: renderer/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: path.resolve(__dirname, "../dist"),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      // 👇 tell Vite we have two HTML entry points
      input: {
        index: path.resolve(__dirname, "index.html"),
        preview: path.resolve(__dirname, "preview.html"),
      },
    },
  },
});
