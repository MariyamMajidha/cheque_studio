// path: electron/ipc/types.ts
import { z } from 'zod';
import { Field } from '../../shared/constants';

/** ---------------- Channels ---------------- */
export type IpcChannel =
  | 'templates:list'
  | 'templates:get'
  | 'templates:create'
  | 'templates:update'
  | 'templates:delete'
  | 'templates:export'
  | 'templates:import'
  | 'boxes:list'
  | 'boxes:upsertMany'
  | 'boxes:delete'
  | 'cheques:list'
  | 'cheques:createOne'
  | 'cheques:importExcel'
  | 'print:preview'
  | 'print:run'
  | 'settings:get'
  | 'settings:set'
  | 'backup:run'
  | 'restore:run';

/** ---------------- Schemas ----------------- */
export const idSchema = z.number().int().nonnegative();

export const templateCreateSchema = z.object({
  name: z.string().min(1),
  width_mm: z.number().positive(),
  height_mm: z.number().positive(),
  dpi: z.number().int().positive(),
  orientation: z.enum(['Portrait', 'Landscape']),
  margin_mm: z.number().min(0),
  background_path: z.string().nullable().optional()
});

export const templateUpdateSchema = templateCreateSchema.partial();

/**
 * NOTE: `id` is optional because we upsert by deleting all rows then inserting
 * fresh ones; newly created boxes won’t have an id yet.
 */
export const boxSchema = z.object({
  id: z.number().int().nonnegative().optional(),
  template_id: z.number().int().nonnegative(),
  label: z.string(),
  mapped_field: z.union([z.nativeEnum(Field), z.literal(''), z.null()]),
  x_mm: z.number(),
  y_mm: z.number(),
  w_mm: z.number().positive(),
  h_mm: z.number().positive(),
  font_family: z.string().default('System'),
  font_size: z.number().positive().default(12),
  bold: z.union([z.literal(0), z.literal(1)]).default(0),
  italic: z.union([z.literal(0), z.literal(1)]).default(0),
  align: z.enum(['left', 'center', 'right']).default('left'),
  uppercase: z.union([z.literal(0), z.literal(1)]).default(0),
  letter_spacing: z.number().default(0),
  line_height: z.number().positive().default(1.2),
  color: z.string().default('#000000'),
  rotation: z.number().default(0),
  locked: z.union([z.literal(0), z.literal(1)]).default(0),
  z_index: z.number().int().default(0),
  date_format: z.string().nullable().optional(),
  date_digit_index: z.number().int().min(0).max(7).nullable().optional()
});

export const upsertBoxesSchema = z.object({
  templateId: idSchema,
  boxes: z.array(boxSchema)
});

export const chequeCreateSchema = z.object({
  template_id: idSchema,
  date: z.string(),
  payee: z.string(),
  amount: z.number().nonnegative(),
  amount_words: z.string()
});

export const printPreviewSchema = z.object({
  templateId: idSchema,
  chequeIds: z.array(idSchema),
  printerName: z.string().optional(),
  offsets: z
    .object({
      offset_x_mm: z.number().default(0),
      offset_y_mm: z.number().default(0)
    })
    .optional()
});

export const printRunSchema = printPreviewSchema.extend({
  copies: z.number().int().min(1).default(1),
  silent: z.boolean().default(false)
});

export type ExcelImportArgs = {
  filePath: string;
  columnMap: Record<string, string>;
};

/** -------- Inferred TS types (export for app use) -------- */
export type TemplateCreate = z.infer<typeof templateCreateSchema>;
export type TemplatePatch = z.infer<typeof templateUpdateSchema>;

export type BoxRow = z.infer<typeof boxSchema>;
export type UpsertBoxesArgs = z.infer<typeof upsertBoxesSchema>;

export type ChequeCreate = z.infer<typeof chequeCreateSchema>;
export type PrintPreviewArgs = z.infer<typeof printPreviewSchema>;
export type PrintRunArgs = z.infer<typeof printRunSchema>;

export type TemplateRow = {
  id: number;
  name: string;
  width_mm: number;
  height_mm: number;
  dpi: number;
  orientation: 'Portrait' | 'Landscape';
  margin_mm: number;
  background_path: string | null;
  updated_at?: string;
};

/** -------- API surface exposed via preload (window.api) --- */
export interface IpcApi {
  templates: {
    list: () => Promise<
      Array<{
        id: number;
        name: string;
        width_mm: number;
        height_mm: number;
        dpi: number;
        updated_at?: string;
      }>
    >;
    get: (id: number) => Promise<any>;
    create: (payload?: Partial<TemplateCreate>) => Promise<{ id: number }>;
    update: (id: number, patch: TemplatePatch) => Promise<void>;
    delete: (id: number) => Promise<void>;
    templates: {
      list: () => Promise<
        Array<{
          id: number;
          name: string;
          width_mm: number;
          height_mm: number;
          dpi: number;
          updated_at?: string;
          // optional to read in list views; present in SELECT above:
          background_path?: string | null;
        }>
      >;
      get: (id: number) => Promise<TemplateRow>;
      create: (payload?: Partial<TemplateCreate>) => Promise<{ id: number }>;
      update: (id: number, patch: TemplatePatch) => Promise<void>;
      delete: (id: number) => Promise<void>;

      // NEW:
      pickBackground: (id: number) => Promise<{ ok: boolean; path?: string }>;
      clearBackground: (id: number) => Promise<{ ok: boolean }>;
    };
  };
  boxes: {
    list: (templateId: number) => Promise<BoxRow[]>;
    upsertMany: (templateId: number, boxes: BoxRow[]) => Promise<void>;
    delete: (id: number) => Promise<void>;
  };
  cheques: {
    list: (templateId: number) => Promise<
      Array<{
        id: number;
        date: string;
        payee: string;
        amount: number;
        cheque_no: string;
      }>
    >;
    createOne: (payload: any) => Promise<void>;
  };
  print: {
    preview: (args: PrintPreviewArgs) => Promise<void>;
    run: (args?: PrintRunArgs) => Promise<void>; // ← args optional
  };
}
