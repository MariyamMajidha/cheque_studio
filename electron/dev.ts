// path: electron/dev.ts
import { spawn } from "node:child_process";
import path from "node:path";

function startElectron() {
  const electronBinary = require("electron") as string;
  const proc = spawn(electronBinary, [path.join(process.cwd(), "dist-electron", "main.cjs")], {
    stdio: "inherit",
    env: { ...process.env }
  });
  proc.on("close", code => process.exit(code ?? 0));
}

startElectron();
