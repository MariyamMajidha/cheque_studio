export enum Field {
  PayeeName = "PayeeName",
  AmountWords = "AmountWords",
  AmountNumeric = "AmountNumeric",
  Date = "Date",
}

export const DEFAULT_DPI = 300;
export const MM_PER_INCH = 25.4;

export const FIELD_OPTIONS: { value: Field; label: string }[] = Object.values(
  Field
).map((v) => ({
  value: v,
  label: v.replace(/([A-Z])/g, " $1").trim(),
}));
