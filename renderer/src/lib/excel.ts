// path: renderer/src/lib/excel.ts
import * as XLSX from "xlsx";

export function parseExcel(filePath: string) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];
}
