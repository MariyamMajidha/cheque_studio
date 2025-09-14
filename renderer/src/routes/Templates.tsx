// path: renderer/src/routes/Templates.tsx
import * as React from "react";
import { useNavigate } from "@tanstack/react-router";

type TemplateRow = {
  id: number;
  name: string;
  width_mm: number;
  height_mm: number;
  dpi: number;
  updated_at?: string | null;
};

export default function Templates() {
  const nav = useNavigate();
  const [rows, setRows] = React.useState<TemplateRow[]>([]);
  const [busyId, setBusyId] = React.useState<number | null>(null);
  const [editRow, setEditRow] = React.useState<TemplateRow | null>(null);

  const load = React.useCallback(async () => {
    const list = await window.api.templates.list();
    setRows(list);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onNew = async () => {
    const { id } = await window.api.templates.create();
    nav({ to: "/designer/$templateId", params: { templateId: String(id) } });
  };

  const onEdit = (id: number) => {
    nav({ to: "/designer/$templateId", params: { templateId: String(id) } });
  };

  const onDelete = async (id: number) => {
    if (!confirm("Delete this template? This will remove its boxes as well."))
      return;
    try {
      setBusyId(id);
      await window.api.templates.delete(id);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const onSaveEdit = async () => {
    if (!editRow) return;
    try {
      await window.api.templates.update(editRow.id, {
        name: editRow.name,
        width_mm: editRow.width_mm,
        height_mm: editRow.height_mm,
        dpi: editRow.dpi,
      });
      setEditRow(null);
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to update template");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Templates</h2>
        <button
          onClick={onNew}
          className="px-3 py-2 rounded bg-blue-600 text-white"
        >
          New
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-500">
            <th className="text-left py-2">Name</th>
            <th className="text-left">Size (mm)</th>
            <th className="text-left">DPI</th>
            <th className="text-left">Updated</th>
            <th className="text-left w-56">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isEditing = editRow?.id === r.id;
            return (
              <tr key={r.id} className="border-t">
                <td className="py-2">
                  {isEditing ? (
                    <input
                      value={editRow.name}
                      onChange={(e) =>
                        setEditRow({ ...editRow, name: e.target.value })
                      }
                      className="border px-2 py-1 rounded w-32"
                    />
                  ) : (
                    r.name
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={editRow.width_mm}
                        onChange={(e) =>
                          setEditRow({
                            ...editRow,
                            width_mm: Number(e.target.value),
                          })
                        }
                        className="border w-16 px-1"
                      />
                      ×
                      <input
                        type="number"
                        value={editRow.height_mm}
                        onChange={(e) =>
                          setEditRow({
                            ...editRow,
                            height_mm: Number(e.target.value),
                          })
                        }
                        className="border w-16 px-1"
                      />
                    </div>
                  ) : (
                    `${r.width_mm} × ${r.height_mm}`
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editRow.dpi}
                      onChange={(e) =>
                        setEditRow({ ...editRow, dpi: Number(e.target.value) })
                      }
                      className="border w-20 px-1"
                    />
                  ) : (
                    r.dpi
                  )}
                </td>
                <td>{r.updated_at?.replace("T", " ").slice(0, 19) ?? ""}</td>
                <td className="space-x-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={onSaveEdit}
                        className="px-2 py-1 rounded border bg-green-600 text-white"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditRow(null)}
                        className="px-2 py-1 rounded border"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => onEdit(r.id)}
                        className="px-2 py-1 rounded border"
                      >
                        Design
                      </button>
                      <button
                        onClick={() => setEditRow(r)}
                        className="px-2 py-1 rounded border"
                      >
                        Update
                      </button>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => onDelete(r.id)}
                        className="px-2 py-1 rounded border text-red-600 disabled:opacity-50"
                        title="Delete template"
                      >
                        {busyId === r.id ? "Deleting…" : "Delete"}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-10 text-center text-slate-500">
                No templates yet. Click <b>New</b> to create one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
