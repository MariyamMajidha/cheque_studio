// path: shared/models.ts
import { Field } from "./constants";

export type Orientation = "Portrait" | "Landscape";

export interface Template {
  id: number;
  name: string;
  width_mm: number;
  height_mm: number;
  dpi: number;
  orientation: Orientation;
  margin_mm: number;
  created_at: string;
  updated_at: string;
  background_path: string | null;
}

export interface Box {
  id: number;
  template_id: number;
  label: string;
  mapped_field: `${Field}` | "";
  x_mm: number;
  y_mm: number;
  w_mm: number;
  h_mm: number;
  font_family: string;
  font_size: number;
  bold: 0 | 1;
  italic: 0 | 1;
  align: "left" | "center" | "right";
  uppercase: 0 | 1;
  letter_spacing: number;
  line_height: number;
  color: string;
  rotation: number;
  locked: 0 | 1;
  z_index: number;
}

export interface Cheque {
  id: number;
  template_id: number;
  date: string; // dd-MM-yyyy
  payee: string;
  amount: number;
  amount_words: string;
  cheque_no: string;
  account_no: string;
  bank: string;
  branch: string;
  custom1?: string | null;
  custom2?: string | null;
  custom3?: string | null;
  custom4?: string | null;
  custom5?: string | null;
  custom6?: string | null;
  custom7?: string | null;
  custom8?: string | null;
  custom9?: string | null;
  custom10?: string | null;
  created_at: string;
}

export interface PrinterProfile {
  id: number;
  template_id: number;
  printer_name: string;
  offset_x_mm: number;
  offset_y_mm: number;
  last_used_at: string | null;
}
