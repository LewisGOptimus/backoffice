"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJson, isSuccess } from "@/lib/client/api";
import { formatDateOnly, looksLikeDateField } from "@/lib/client/date-format";
import { formatMoney, looksLikeMoneyField } from "@/lib/client/currency-format";
import toast from "react-hot-toast";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { AppModal } from "@/components/ui/modal";

type FieldType = "text" | "number" | "date" | "select";

type Field = {
  key: string;
  label: string;
  type?: FieldType;
  options?: Array<{ value: string; label: string }>;
};

type Column = {
  key: string;
  label: string;
  badge?: boolean;
};

type Row = Record<string, unknown> & { id?: string };

type Props = {
  title: string;
  resource: string;
  fields: Field[];
  columns: Column[];
  initial: Record<string, string>;
};

function formatCell(value: unknown, badge?: boolean, key?: string) {
  const text = key && looksLikeDateField(key)
    ? formatDateOnly(value)
    : key && looksLikeMoneyField(key)
      ? formatMoney(value)
      : String(value ?? "-");
  if (!badge) return text;
  return <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{text}</span>;
}

export function CrudModule({ title, resource, fields, columns, initial }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<Record<string, string>>(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const orderedRows = useMemo(() => [...rows], [rows]);

  const tableColumns: DataTableColumn<Row>[] = useMemo(() => {
    const base: DataTableColumn<Row>[] = [
      {
        key: "__index",
        header: "#",
        headerClassName: "text-white bg-[var(--color-primary)]",
        cellClassName: "text-slate-700 w-[40px]",
        render: (_row, index) => index + 1,
      },
      ...columns.map<DataTableColumn<Row>>((c) => ({
        key: c.key,
        header: c.label,
        headerClassName: "text-white bg-[var(--color-primary)]",
        cellClassName: "text-slate-700",
        render: (row) => formatCell(row[c.key], c.badge, c.key),
      })),
      {
        key: "__actions",
        header: "Acciones",
        headerClassName: "text-white bg-[var(--color-primary)]",
        cellClassName: "",
        render: (row) => (
          <div className="flex gap-1.5">
            <button
              onClick={() => openEdit(row)}
              className="rounded bg-slate-800 px-2 py-1 text-[11px] text-white"
            >
              Editar
            </button>
            <button
              onClick={() => remove(row)}
              className="rounded bg-rose-700 px-2 py-1 text-[11px] text-white"
            >
              Eliminar
            </button>
          </div>
        ),
      },
    ];
    return base;
  }, [columns]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetchJson<Row[]>(`/api/v1/${resource}`);
    setLoading(false);
    if (isSuccess(res)) setRows(res.data);
  }, [resource]);

  useEffect(() => {
    const t = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(t);
  }, [refresh]);

  const openCreate = () => {
    setEditingId(null);
    setForm(initial);
    setModalOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditingId(String(row.id));
    const next: Record<string, string> = {};
    for (const f of fields) next[f.key] = String(row[f.key] ?? "");
    setForm(next);
    setModalOpen(true);
  };

  const parsePayload = (raw: Record<string, string>) => {
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const value = raw[f.key];
      if (value === "") continue;
      if (f.type === "number") payload[f.key] = Number(value);
      else if (value === "true") payload[f.key] = true;
      else if (value === "false") payload[f.key] = false;
      else payload[f.key] = value;
    }
    return payload;
  };

  const save = async () => {
    try {
      const endpoint = editingId ? `/api/v1/${resource}/${editingId}` : `/api/v1/${resource}`;
      const method = editingId ? "PATCH" : "POST";
      const res = await fetchJson<Row>(endpoint, { method, body: parsePayload(form) });
      if (isSuccess(res)) {
        const m = editingId ? "Registro actualizado." : "Registro creado.";
        setMessage(m);
        toast.success(m);
        setModalOpen(false);
        await refresh();
        return;
      }
      setMessage(res.error.message);
      toast.error(res.error.message);
    } catch {
      toast.error("Error de red al guardar.");
    }
  };

  const remove = async (row: Row) => {
    try {
      if (!row.id) return;
      const res = await fetchJson<Row>(`/api/v1/${resource}/${row.id}`, { method: "DELETE" });
      if (isSuccess(res)) {
        setMessage("Registro eliminado.");
        toast.success("Registro eliminado.");
        await refresh();
        return;
      }
      setMessage(res.error.message);
      toast.error(res.error.message);
    } catch {
      toast.error("Error de red al eliminar.");
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white w-full p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <button onClick={openCreate} className="rounded bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white">Nuevo</button>
      </div>
      <DataTable
        columns={tableColumns}
        rows={orderedRows}
        getRowKey={(row, index) => `${String(row.id ?? "")}-${index}`}
        className="max-h-[620px] overflow-auto rounded border border-slate-200"
      />
      <p className="text-xs text-slate-600">{loading ? "Cargando..." : message}</p>

      <AppModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidthClassName="max-w-3xl"
        title={editingId ? `Editar ${title}` : `Nuevo ${title}`}
        description="Completa los campos y guarda los cambios para actualizar el registro."
        footer={(
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="rounded border border-slate-300 px-3 py-2 text-sm">Cancelar</button>
            <button onClick={save} className="rounded bg-[var(--color-primary)] px-3 py-2 text-sm text-white">Guardar</button>
          </div>
        )}
      >
        <div className="grid gap-2 md:grid-cols-2">
          {fields.map((f) => (
            <label key={f.key} className="text-xs text-slate-700">
              {f.label}
              {f.type === "select" ? (
                <select value={form[f.key] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                  <option value="">Seleccionar...</option>
                  {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input type={f.type ?? "text"} value={form[f.key] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
              )}
            </label>
          ))}
        </div>
      </AppModal>
      
    </section>
  );
}

