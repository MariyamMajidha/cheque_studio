// path: renderer/src/lib/validation.ts
export function isDDMMYYYY(s: string) {
  return /^\d{2}-\d{2}-\d{4}$/.test(s);
}
