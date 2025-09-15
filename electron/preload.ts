// path: electron/preload.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type {
  BoxRow,
  TemplateCreate,
  TemplatePatch,
  PrintPreviewArgs,
  PrintRunArgs,
  ChequeCreate,
  TemplateRow
} from './ipc/types';

type Api = {
  templates: {
    list(): Promise<
      Array<Pick<TemplateRow, 'id' | 'name' | 'width_mm' | 'height_mm' | 'dpi' | 'updated_at'>>
    >;
    get(id: number): Promise<TemplateRow>;
    create(payload?: Partial<TemplateCreate>): Promise<{ id: number }>;
    update(id: number, patch: TemplatePatch): Promise<void>;
    delete(id: number): Promise<void>;
  };
  boxes: {
    list(templateId: number): Promise<BoxRow[]>;
    upsertMany(templateId: number, boxes: BoxRow[]): Promise<void>;
    delete(id: number): Promise<void>;
  };
  cheques: {
    list(templateId: number): Promise<
      Array<{
        id: number;
        template_id: number;
        date: string;
        payee: string;
        amount: number;
        amount_words: string;
        cheque_no: string;
        account_no: string;
        bank: string;
        branch: string;
        created_at: string;
      }>
    >;
    createOne(payload: ChequeCreate): Promise<{ id: number }>;
    update(id: number, data: Partial<ChequeCreate>): Promise<void>;
    delete(id: number): Promise<void>;
    importExcel(args?: any): Promise<{ ok: boolean; imported: number }>;
  };
  print: {
    /** Open preview window (main will feed payload after 'ready') */
    preview(args: PrintPreviewArgs): Promise<void>;
    /** Background print flow (separate worker window) */
    run(args: PrintRunArgs): Promise<void>;
    /** Subscribe to payload the main sends to preview */
    onPayload(cb: (data: any) => void): () => void;
    /** Tell main that the preview page is ready to receive payload */
    ready(): void;
    /** Ask main to print the CURRENT (preview) window */
    runCurrent(): void;
  };
};

const api: Api = {
  // -------- Templates --------
  templates: {
    list: () => ipcRenderer.invoke('templates:list'),
    get: (id) => ipcRenderer.invoke('templates:get', id),
    create: (payload) => ipcRenderer.invoke('templates:create', payload),
    update: (id, patch) => ipcRenderer.invoke('templates:update', id, patch),
    delete: (id) => ipcRenderer.invoke('templates:delete', id)
  },

  // -------- Boxes --------
  boxes: {
    list: (templateId) => ipcRenderer.invoke('boxes:list', templateId),
    upsertMany: (templateId, boxes) => ipcRenderer.invoke('boxes:upsertMany', templateId, boxes),
    delete: (id) => ipcRenderer.invoke('boxes:delete', id)
  },

  // -------- Cheques --------
  cheques: {
    list: (templateId) => ipcRenderer.invoke('cheques:list', { template_id: templateId }),
    createOne: (payload) => ipcRenderer.invoke('cheques:createOne', payload),
    update: (id, data) => ipcRenderer.invoke('cheques:update', id, data),
    delete: (id) => ipcRenderer.invoke('cheques:delete', id),
    importExcel: (args) => ipcRenderer.invoke('cheques:importExcel', args)
  },

  // -------- Print --------
  print: {
    preview: (args) => ipcRenderer.invoke('print:preview', args),
    run: (args) => ipcRenderer.invoke('print:run', args),

    onPayload: (cb) => {
      const handler = (_evt: IpcRendererEvent, data: any) => cb(data);
      ipcRenderer.on('print:payload', handler);
      return () => ipcRenderer.removeListener('print:payload', handler);
    },

    ready: () => ipcRenderer.send('print:ready'),

    // NEW: print the *current* preview window (handled by main on 'print:run-current')
    runCurrent: () => ipcRenderer.send('print:run-current')
  }
};

contextBridge.exposeInMainWorld('api', api);
export {};
