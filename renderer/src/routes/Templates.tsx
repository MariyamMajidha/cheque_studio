import * as React from "react";
import { useNavigate } from "@tanstack/react-router";

type TemplateRow = {
  id: number;
  name: string;
  width_mm: number;
  height_mm: number;
  dpi: number;
  background_path?: string | null;
  updated_at?: string | null;
};

function BgThumb({ id, hasPath }: { id: number; hasPath: boolean }) {
  const [src, setSrc] = React.useState<string | null>(null);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!hasPath) return setSrc(null);
      const r = await window.api.templates.getBackgroundDataUrl(id);
      if (alive) setSrc(r?.dataUrl ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [id, hasPath]);

  if (!src) return <span className="text-slate-400">—</span>;
  return (
    <img src={src} alt="bg" className="w-24 h-12 object-cover border rounded" />
  );
}

/** Small actions dropdown for each row */
function RowActions({
  row,
  busy,
  onDesign,
  onUpdate,
  onSetBg,
  onClearBg,
  onDelete,
  onExportOne,
}: {
  row: TemplateRow;
  busy: boolean;
  onDesign: (id: number) => void;
  onUpdate: (row: TemplateRow) => void;
  onSetBg: (id: number) => void;
  onClearBg: (id: number) => void;
  onDelete: (id: number) => void;
  onExportOne: (id: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-2 py-1 rounded border hover:bg-gray-50"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Actions"
      >
        ⋯
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-48 rounded-md border bg-white shadow-lg z-10 overflow-hidden"
        >
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDesign(row.id);
            }}
            className="w-full text-left px-3 py-2 hover:bg-gray-50"
          >
            Design
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onUpdate(row);
            }}
            className="w-full text-left px-3 py-2 hover:bg-gray-50"
          >
            Update
          </button>
          <div className="my-1 h-px bg-gray-200" />
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSetBg(row.id);
            }}
            className="w-full text-left px-3 py-2 hover:bg-gray-50"
          >
            Set background…
          </button>
          <button
            role="menuitem"
            disabled={!row.background_path}
            onClick={() => {
              setOpen(false);
              onClearBg(row.id);
            }}
            className="w-full text-left px-3 py-2 hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed"
          >
            Clear background
          </button>
          <div className="my-1 h-px bg-gray-200" />
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onExportOne(row.id);
            }}
            className="w-full text-left px-3 py-2 hover:bg-gray-50"
          >
            Export…
          </button>
          <div className="my-1 h-px bg-gray-200" />
          <button
            role="menuitem"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              onDelete(row.id);
            }}
            className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Templates() {
  const nav = useNavigate();
  const [rows, setRows] = React.useState<TemplateRow[]>([]);
  const [busyId, setBusyId] = React.useState<number | null>(null);
  const [editRow, setEditRow] = React.useState<TemplateRow | null>(null);

  // selection for bulk export
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const allChecked = rows.length > 0 && selected.size === rows.length;
  const someChecked = selected.size > 0 && selected.size < rows.length;
  const toggleAll = () =>
    setSelected((s) =>
      s.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))
    );

  const load = React.useCallback(async () => {
    const list = await window.api.templates.list();
    setRows(list);
    setSelected(new Set());
  }, []);
  React.useEffect(() => {
    load();
  }, [load]);

  const onNew = async () => {
    const { id } = await window.api.templates.create();
    nav({ to: "/designer/$templateId", params: { templateId: String(id) } });
  };
  const onEdit = (id: number) =>
    nav({ to: "/designer/$templateId", params: { templateId: String(id) } });

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

  const onSetBg = async (id: number) => {
    await window.api.templates.pickBackground(id);
    await load();
  };
  const onClearBg = async (id: number) => {
    if (!confirm("Remove background image for this template?")) return;
    await window.api.templates.clearBackground(id);
    await load();
  };

  // bulk import/export
  const onImportMany = async () => {
    const r = await window.api.templates.importMany();
    if (r?.ok) {
      await load();
      alert(`Imported ${r.imported} template(s).`);
    }
  };
  const onExportSelected = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    const r = await window.api.templates.exportMany(ids);
    if (r?.ok) alert(`Exported ${r.exported} template(s).`);
  };
  const onExportOne = async (id: number) => {
    const r = await window.api.templates.exportMany([id]);
    if (r?.ok) alert(`Exported 1 template.`);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Templates</h2>
        <div className="flex gap-2">
          <button onClick={onImportMany} className="px-3 py-2 rounded border">
            Import…
          </button>
          <button
            onClick={onExportSelected}
            disabled={!selected.size}
            className="px-3 py-2 rounded border disabled:opacity-50"
            title={
              !selected.size
                ? "Select at least one row"
                : "Export selected templates"
            }
          >
            Export selected…
          </button>
          <button
            onClick={onNew}
            className="px-3 py-2 rounded bg-blue-600 text-white"
          >
            New
          </button>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-500">
            <th className="text-left py-2 w-8">
              {/* tri-state checkbox */}
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = someChecked;
                }}
                onChange={toggleAll}
              />
            </th>
            <th className="text-left py-2">Name</th>
            <th className="text-left">Size (mm)</th>
            <th className="text-left">DPI</th>
            <th className="text-left">Background</th>
            <th className="text-left">Updated</th>
            <th className="text-left w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isEditing = editRow?.id === r.id;
            return (
              <tr key={r.id} className="border-t">
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                  />
                </td>

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
                    <div className="flex items-center gap-1">
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
                      <span>×</span>
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

                <td>
                  <BgThumb id={r.id} hasPath={!!r.background_path} />
                </td>
                <td>{r.updated_at?.replace("T", " ").slice(0, 19) ?? ""}</td>

                <td className="py-2">
                  {isEditing ? (
                    <div className="flex gap-2">
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
                    </div>
                  ) : (
                    <RowActions
                      row={r}
                      busy={busyId === r.id}
                      onDesign={onEdit}
                      onUpdate={setEditRow}
                      onSetBg={onSetBg}
                      onClearBg={onClearBg}
                      onDelete={onDelete}
                      onExportOne={onExportOne}
                    />
                  )}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="py-10 text-center text-slate-500">
                No templates yet. Click <b>New</b> to create one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
