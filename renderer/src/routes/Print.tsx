// path: renderer/src/routes/Print.tsx
import React, { useEffect, useState } from "react";
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type {
  TemplateRow,
  PrintPreviewArgs,
  PrintRunArgs,
} from "../../../electron/ipc/types";

const qc = new QueryClient();

function PrintInner() {
  const templatesQ = useQuery({
    queryKey: ["templates"],
    queryFn: () => window.api.templates.list(),
  });

  const [templateId, setTemplateId] = useState<number>(0);
  const [chequeIdsText, setChequeIdsText] = useState<string>("");
  const [printerName, setPrinterName] = useState<string>("");
  const [copies, setCopies] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);

  useEffect(() => {
    const list = templatesQ.data ?? [];
    if (list.length && !list.some((t: any) => t.id === templateId)) {
      setTemplateId(list[0].id);
    }
  }, [templatesQ.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const chequeIds = chequeIdsText
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  const canPrint = !!templateId && chequeIds.length > 0;

  const doPreview = async () => {
    const args: PrintPreviewArgs = {
      templateId,
      chequeIds,
      printerName: printerName || undefined,
      offsets: { offset_x_mm: offsetX, offset_y_mm: offsetY },
    };
    await window.api.print.preview(args);
  };

  const doRun = async () => {
    const args: PrintRunArgs = {
      templateId,
      chequeIds,
      printerName: printerName || undefined,
      offsets: { offset_x_mm: offsetX, offset_y_mm: offsetY },
      copies,
      silent: false,
    };
    await window.api.print.run(args);
  };

  const templates = templatesQ.data ?? [];

  return (
    <div className="p-4 max-w-2xl space-y-3">
      <h2 className="text-xl font-semibold">Print</h2>

      <label className="block">
        <span className="text-sm text-gray-600">Template</span>
        <select
          className="mt-1 border rounded px-2 py-1"
          value={templateId || ""}
          onChange={(e) => setTemplateId(Number(e.target.value))}
          disabled={!templates.length}
        >
          {!templates.length && <option value="">No templates</option>}
          {templates.map((t: TemplateRow) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm text-gray-600">
          Cheque IDs (comma separated)
        </span>
        <input
          className="mt-1 w-full border rounded px-2 py-1"
          value={chequeIdsText}
          onChange={(e) => setChequeIdsText(e.target.value)}
          placeholder="e.g. 1,2,3"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-gray-600">Printer (optional)</span>
          <input
            className="mt-1 w-full border rounded px-2 py-1"
            value={printerName}
            onChange={(e) => setPrinterName(e.target.value)}
            placeholder="System default if empty"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Copies</span>
          <input
            type="number"
            min={1}
            className="mt-1 w-full border rounded px-2 py-1"
            value={copies}
            onChange={(e) => setCopies(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-gray-600">Offset X (mm)</span>
          <input
            type="number"
            className="mt-1 w-full border rounded px-2 py-1"
            value={offsetX}
            onChange={(e) => setOffsetX(Number(e.target.value))}
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Offset Y (mm)</span>
          <input
            type="number"
            className="mt-1 w-full border rounded px-2 py-1"
            value={offsetY}
            onChange={(e) => setOffsetY(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50"
          disabled={!canPrint}
          onClick={doPreview}
        >
          Preview
        </button>
        <button
          className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
          disabled={!canPrint}
          onClick={doRun}
        >
          Print
        </button>
      </div>
    </div>
  );
}

export default function Print() {
  return (
    <QueryClientProvider client={qc}>
      <PrintInner />
    </QueryClientProvider>
  );
}
