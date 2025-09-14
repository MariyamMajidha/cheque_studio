// path: renderer/src/lib/units.ts
import { MM_PER_INCH } from "@shared/constants";
export const mmToPx = (mm: number, dpi: number) => (mm * dpi) / MM_PER_INCH;
export const pxToMm = (px: number, dpi: number) => (px * MM_PER_INCH) / dpi;
