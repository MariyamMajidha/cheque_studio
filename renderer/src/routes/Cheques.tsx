import React, { useEffect, useMemo, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { amountToWords } from "../lib/amountToWords";
import type { TemplateRow } from "../../../electron/ipc/types";

const qc = new QueryClient();

type ChequeRow = {
  id: number;
  template_id: number;
  date: string;
  payee: string;
  amount: number;
  amount_words: string;
  created_at?: string;
};

type FormState = Omit<ChequeRow, "id" | "created_at">;

function ChequesInner() {
  const rq = useQueryClient();

  // --- Queries ------------------------------------------------------------
  const templatesQ = useQuery({
    queryKey: ["templates"],
    queryFn: () => window.api.templates.list() as Promise<TemplateRow[]>,
  });

  // IMPORTANT: we now fetch ALL recent cheques (handler supports template_id 0)
  const chequesQ = useQuery({
    queryKey: ["cheques", 0],
    queryFn: () => window.api.cheques.list(0) as Promise<ChequeRow[]>,
  });

  // --- Form state ---------------------------------------------------------
  const [form, setForm] = useState<FormState>({
    template_id: 0,
    date: "",
    payee: "",
    amount: 0,
    amount_words: "",
  });

  // pick first template as default
  useEffect(() => {
    const list = templatesQ.data ?? [];
    if (list.length && !form.template_id) {
      setForm((f) => ({ ...f, template_id: list[0].id }));
    }
  }, [templatesQ.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Selection & mode ---------------------------------------------------
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editId, setEditId] = useState<number | null>(null);

  const allRows = chequesQ.data ?? [];
  const allIds = useMemo(() => allRows.map((r) => r.id), [allRows]);
  const isAllSelected =
    selectedIds.length > 0 && selectedIds.length === allRows.length;

  const toggleRow = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleAll = () => setSelectedIds((prev) => (prev.length ? [] : allIds));

  // --- Mutations ----------------------------------------------------------
  const createOne = useMutation({
    mutationFn: (payload: FormState) => window.api.cheques.createOne(payload),
    onSuccess: async () => {
      await rq.invalidateQueries({ queryKey: ["cheques", 0] });
      setEditId(null);
      setSelectedIds([]);
    },
    onError: (err: any) => {
      alert(err?.message ?? "Failed to add cheque");
    },
  });

  const updateOne = useMutation({
    mutationFn: (input: { id: number; data: FormState }) =>
      window.api.cheques.update(input.id, input.data),
    onSuccess: async () => {
      await rq.invalidateQueries({ queryKey: ["cheques", 0] });
      setEditId(null);
    },
    onError: (err: any) => {
      alert(err?.message ?? "Failed to save changes");
    },
  });

  const deleteOne = useMutation({
    mutationFn: (id: number) => window.api.cheques.delete(id),
    onSuccess: async () => {
      await rq.invalidateQueries({ queryKey: ["cheques", 0] });
      setSelectedIds((prev) => prev.filter((x) => x !== editId!));
      setEditId(null);
    },
    onError: (err: any) => {
      alert(err?.message ?? "Failed to delete cheque");
    },
  });

  const importExcel = async () => {
    try {
      await window.api.cheques.importExcel?.(); // optional
      rq.invalidateQueries({ queryKey: ["cheques", 0] });
    } catch {
      // ignore if not implemented
    }
  };

  // --- Helpers ------------------------------------------------------------
  const resetForm = () =>
    setForm((f) => ({
      template_id: templatesQ.data?.[0]?.id ?? 0,
      date: "",
      payee: "",
      amount: 0,
      amount_words: "",
    }));

  // Amount words is required → include it in the gating
  const canAdd =
    !editId &&
    !!form.template_id &&
    form.date.trim() &&
    form.payee.trim() &&
    form.amount >= 0 &&
    form.amount_words.trim().length > 0;

  const canSaveEdit =
    !!editId &&
    !!form.template_id &&
    form.date.trim() &&
    form.payee.trim() &&
    form.amount >= 0 &&
    form.amount_words.trim().length > 0;

  const onAdd = async () => {
    // Ensure amount_words is consistent at submit time
    const payload: FormState = {
      ...form,
      amount_words: form.amount_words || amountToWords(form.amount),
    };
    await createOne.mutateAsync(payload);
    resetForm();
  };

  const onClear = () => {
    resetForm();
    setEditId(null);
  };

  const beginEdit = (row: ChequeRow) => {
    setEditId(row.id);
    setForm({
      template_id: row.template_id,
      date: row.date,
      payee: row.payee,
      amount: row.amount,
      amount_words: row.amount_words,
    });
  };

  const onSaveEdit = async () => {
    if (!editId) return;
    const payload: FormState = {
      ...form,
      amount_words: form.amount_words || amountToWords(form.amount),
    };
    await updateOne.mutateAsync({ id: editId, data: payload });
  };

  const onDelete = async (id: number) => {
    await deleteOne.mutateAsync(id);
  };

  const doPreviewIds = async (ids: number[]) => {
    if (!ids.length) return;
    await window.api.print.preview({
      templateId: form.template_id,
      chequeIds: ids,
      offsets: { offset_x_mm: 0, offset_y_mm: 0 },
    });
  };

  const doPrintIds = async (ids: number[]) => {
    if (!ids.length) return;
    await window.api.print.run({
      templateId: form.template_id,
      chequeIds: ids,
      copies: 1,
      silent: false,
      offsets: { offset_x_mm: 0, offset_y_mm: 0 },
    });
  };

  // --- UI -----------------------------------------------------------------
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Cheques</h1>

      {/* Form */}
      <div className="border rounded p-3 bg-gray-50">
        <div className="grid grid-cols-[160px_160px_1fr] gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Template</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.template_id || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, template_id: Number(e.target.value) }))
              }
              disabled={!templatesQ.data?.length}
            >
              {!templatesQ.data?.length && (
                <option value="">No templates</option>
              )}
              {(templatesQ.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Date</label>
            <input
              className="w-full border rounded px-2 py-1"
              placeholder="dd-MM-yyyy"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Payee</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.payee}
              onChange={(e) =>
                setForm((f) => ({ ...f, payee: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-[160px_1fr_auto_auto] gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Amount</label>
            <input
              type="number"
              className="w-full border rounded px-2 py-1"
              value={form.amount}
              onChange={(e) => {
                const amt = Number(e.target.value);
                setForm((f) => ({
                  ...f,
                  amount: amt,
                  amount_words: amountToWords(amt),
                }));
              }}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Amount to words
            </label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.amount_words}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount_words: e.target.value }))
              }
            />
          </div>

          <button
            className="self-end px-4 py-2 border rounded"
            onClick={onClear}
            aria-label="Clear"
          >
            Clear
          </button>

          {editId ? (
            <button
              className="self-end px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
              onClick={onSaveEdit}
              disabled={!canSaveEdit || updateOne.isPending}
            >
              Save
            </button>
          ) : (
            <button
              className="self-end px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              onClick={onAdd}
              disabled={!canAdd || createOne.isPending}
            >
              Add
            </button>
          )}
        </div>
      </div>

      {/* Bulk toolbar */}
      <div className="flex items-center gap-3">
        <button
          className={`px-4 py-2 border rounded ${isAllSelected ? "bg-blue-50" : ""}`}
          onClick={toggleAll}
        >
          {isAllSelected ? "Unselect All" : "Select All"}
        </button>

        <button className="px-4 py-2 border rounded" onClick={importExcel}>
          Import
        </button>

        <button
          className="px-4 py-2 border rounded"
          onClick={() => doPrintIds(selectedIds.length ? selectedIds : allIds)}
          disabled={!allRows.length}
        >
          Print all
        </button>
      </div>

      {/* Table */}
      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2 w-10"></th>
              <th className="px-3 py-2 w-16">#</th>
              <th className="px-3 py-2 w-32">Date</th>
              <th className="px-3 py-2">Payee</th>
              <th className="px-3 py-2 w-28 text-right">Amount</th>
              <th className="px-3 py-2 w-[280px]">Action</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((r) => {
              const checked = selectedIds.includes(r.id);
              return (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRow(r.id)}
                    />
                  </td>
                  <td className="px-3 py-2">#{r.id}</td>
                  <td className="px-3 py-2">{r.date}</td>
                  <td className="px-3 py-2">{r.payee}</td>
                  <td className="px-3 py-2 text-right">{r.amount}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1 border rounded"
                        onClick={() => beginEdit(r)}
                      >
                        Edit
                      </button>
                      <button
                        className="px-3 py-1 border rounded"
                        onClick={() => onDelete(r.id)}
                      >
                        Delete
                      </button>
                      <button
                        className="px-3 py-1 border rounded"
                        onClick={() => doPreviewIds([r.id])}
                      >
                        Print/Preview
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!allRows.length && (
              <tr>
                <td className="px-3 py-8 text-center text-gray-500" colSpan={6}>
                  No cheques yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Cheques() {
  return (
    <QueryClientProvider client={qc}>
      <ChequesInner />
    </QueryClientProvider>
  );
}
