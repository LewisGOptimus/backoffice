"use client";

import { useEffect, useState } from "react";
import { fetchJson, isSuccess } from "@/lib/client/api";
import { formatDateOnly } from "@/lib/client/date-format";
import { formatMoney } from "@/lib/client/currency-format";
import { toHumanConsumableError, toHumanError } from "@/lib/client/error-mapping";
import toast from "react-hot-toast";

type EmpresaCard = {
  empresa_id: string;
  empresa_nombre: string;
  owner_user_id: string | null;
  owner_nombre: string | null;
  owner_email: string | null;
  suscripcion_id: string | null;
  estado_suscripcion: string | null;
  plan_nombre: string | null;
  periodo_fin: string | null;
  ultima_factura_fecha: string | null;
  ultima_factura_total: string | null;
  total_abierto: string | null;
};

type EmpresaRow = { id: string; nombre: string; nit: string | null; timezone: string; activa: boolean };
type Lookups = { usuarios: Array<{ value: string; label: string }> };

type ConsumablePoolRow = {
  suscripcion_id: string;
  producto_id: string;
  producto_codigo: string;
  producto_nombre: string;
  unidad_consumo: string | null;
  comprado: number;
  consumido: number;
  restante: number;
  vigencia_pago_inicio: string | null;
  vigencia_pago_fin: string | null;
  vigencia_efectiva_inicio: string | null;
  vigencia_efectiva_fin: string | null;
  estado_item: string;
};

function Badge({ text }: { text: string }) {
  return <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{text}</span>;
}

export default function EmpresasPage() {
  const [cards, setCards] = useState<EmpresaCard[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState("Listo");
  const [form, setForm] = useState({ nombre: "", nit: "", timezone: "UTC", activa: "true", owner_user_id: "" });
  const [usuarios, setUsuarios] = useState<Array<{ value: string; label: string }>>([]);
  const [poolByEmpresa, setPoolByEmpresa] = useState<Record<string, ConsumablePoolRow[]>>({});
  const [poolLoadingEmpresaId, setPoolLoadingEmpresaId] = useState<string | null>(null);
  const [openPoolEmpresaId, setOpenPoolEmpresaId] = useState<string | null>(null);

  const mapError = (code: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "BUSINESS_RULE_VIOLATION" | "INTERNAL_ERROR" | "UNAUTHORIZED", message: string) =>
    toHumanConsumableError(message) ?? toHumanError(code, message);

  const refresh = async () => {
    try {
      const [res, lu] = await Promise.all([
        fetchJson<EmpresaCard[]>("/api/backoffice/empresas/cards"),
        fetchJson<Lookups>("/api/backoffice/lookups"),
      ]);
      if (isSuccess(res)) setCards(res.data);
      if (isSuccess(lu)) setUsuarios(lu.data.usuarios);
    } catch {
      toast.error("Error de red al cargar empresas.");
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: "", nit: "", timezone: "UTC", activa: "true", owner_user_id: "" });
    setModal(true);
  };

  const openEdit = async (empresaId: string) => {
    try {
      const res = await fetchJson<EmpresaRow>(`/api/v1/empresas/${empresaId}`);
      if (!isSuccess(res)) {
        toast.error(res.error.message);
        return;
      }
      const row = res.data;
      setEditing(row.id);
      const owner = cards.find((x) => x.empresa_id === empresaId)?.owner_user_id ?? "";
      setForm({ nombre: row.nombre, nit: row.nit ?? "", timezone: row.timezone ?? "UTC", activa: String(row.activa), owner_user_id: owner });
      setModal(true);
    } catch {
      toast.error("Error de red al cargar empresa.");
    }
  };

  const save = async () => {
    if (!form.owner_user_id) {
      toast.error("Debes seleccionar un usuario dueño.");
      return;
    }
    try {
      const payload = {
        id: editing ?? undefined,
        nombre: form.nombre,
        nit: form.nit,
        timezone: form.timezone,
        activa: form.activa === "true",
        owner_user_id: form.owner_user_id,
      };
      const res = await fetchJson<{ empresa_id: string }>("/api/backoffice/empresas/save", { method: "POST", body: payload });
      if (isSuccess(res)) {
        const m = editing ? "Empresa actualizada." : "Empresa creada.";
        setMsg(m);
        toast.success(m);
        setModal(false);
        await refresh();
        return;
      }
      setMsg(res.error.message);
      toast.error(res.error.message);
    } catch {
      toast.error("Error de red al guardar empresa.");
    }
  };

  const remove = async (empresaId: string) => {
    try {
      const res = await fetchJson<EmpresaRow>(`/api/v1/empresas/${empresaId}`, { method: "DELETE" });
      if (isSuccess(res)) {
        setMsg("Empresa eliminada.");
        toast.success("Empresa eliminada.");
        await refresh();
        return;
      }
      setMsg(res.error.message);
      toast.error(res.error.message);
    } catch {
      toast.error("Error de red al eliminar empresa.");
    }
  };

  const togglePool = async (empresaId: string) => {
    if (openPoolEmpresaId === empresaId) {
      setOpenPoolEmpresaId(null);
      return;
    }
    setOpenPoolEmpresaId(empresaId);
    if (poolByEmpresa[empresaId]) return;

    setPoolLoadingEmpresaId(empresaId);
    try {
      const res = await fetchJson<ConsumablePoolRow[]>(`/api/backoffice/empresas/${empresaId}/consumables-pool`);
      if (isSuccess(res)) {
        setPoolByEmpresa((prev) => ({ ...prev, [empresaId]: res.data }));
        return;
      }
      toast.error(mapError(res.error.code, res.error.message));
    } catch {
      toast.error("Error de red al cargar pool de consumibles.");
    } finally {
      setPoolLoadingEmpresaId(null);
    }
  };

  return (
    <main className="space-y-4">
      <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Empresas</h2>
        <button onClick={openCreate} className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Nueva</button>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c, idx) => (
          <article key={c.empresa_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">#{idx + 1}</p>
            <h3 className="text-base font-semibold text-slate-900">{c.empresa_nombre}</h3>

            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Usuario dueño</p>
            <p className="text-sm text-slate-700">{c.owner_nombre ?? "Sin asignar"}</p>
            <p className="text-xs text-slate-500">{c.owner_email ?? "-"}</p>

            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Suscripcion</p>
            <p className="text-sm text-slate-700">{c.plan_nombre ?? "Sin plan"}</p>
            <div className="mt-1 flex gap-1">{c.estado_suscripcion ? <Badge text={c.estado_suscripcion} /> : <Badge text="SIN SUSCRIPCION" />}</div>
            <p className="mt-1 text-xs text-slate-500">Vence: {formatDateOnly(c.periodo_fin)}</p>

            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Facturacion</p>
            <p className="text-xs text-slate-700">Ultima: {formatDateOnly(c.ultima_factura_fecha)} | {formatMoney(c.ultima_factura_total)}</p>
            <p className="text-xs text-slate-700">Abierto: {formatMoney(c.total_abierto)}</p>

            <div className="mt-3 flex gap-2">
              <button onClick={() => openEdit(c.empresa_id)} className="rounded bg-slate-800 px-2 py-1 text-[11px] text-white">Editar</button>
              <button onClick={() => remove(c.empresa_id)} className="rounded bg-rose-700 px-2 py-1 text-[11px] text-white">Eliminar</button>
              <button onClick={() => void togglePool(c.empresa_id)} className="rounded border border-slate-300 px-2 py-1 text-[11px]">Pool consumibles</button>
            </div>

            {openPoolEmpresaId === c.empresa_id && (
              <div className="mt-3 rounded border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-700">Pool de creditos consumibles</div>
                {poolLoadingEmpresaId === c.empresa_id ? (
                  <p className="p-2 text-xs text-slate-600">Cargando...</p>
                ) : (
                  <div className="max-h-48 overflow-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-2 py-1.5 text-left">Producto</th>
                          <th className="px-2 py-1.5 text-left">Unidad</th>
                          <th className="px-2 py-1.5 text-left">Comprado</th>
                          <th className="px-2 py-1.5 text-left">Consumido</th>
                          <th className="px-2 py-1.5 text-left">Restante</th>
                          <th className="px-2 py-1.5 text-left">Vigencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(poolByEmpresa[c.empresa_id] ?? []).map((row) => (
                          <tr key={`${row.suscripcion_id}-${row.producto_id}`} className="border-t border-slate-100">
                            <td className="px-2 py-1.5">{row.producto_nombre}</td>
                            <td className="px-2 py-1.5">{row.unidad_consumo ?? "-"}</td>
                            <td className="px-2 py-1.5">{row.comprado}</td>
                            <td className="px-2 py-1.5">{row.consumido}</td>
                            <td className="px-2 py-1.5">{row.restante}</td>
                            <td className="px-2 py-1.5">{formatDateOnly(row.vigencia_pago_inicio)} - {formatDateOnly(row.vigencia_pago_fin)}</td>
                          </tr>
                        ))}
                        {(poolByEmpresa[c.empresa_id] ?? []).length === 0 && (
                          <tr>
                            <td className="px-2 py-2 text-slate-500" colSpan={6}>No hay pool consumible vigente para esta empresa.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </article>
        ))}
      </section>
      <p className="text-xs text-slate-600">{msg}</p>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900">{editing ? "Editar empresa" : "Nueva empresa"}</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <label className="text-xs">Nombre<input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" /></label>
              <label className="text-xs">NIT<input value={form.nit} onChange={(e) => setForm((p) => ({ ...p, nit: e.target.value }))} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" /></label>
              <label className="text-xs">Timezone<input value={form.timezone} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" /></label>
              <label className="text-xs">Activa<select value={form.activa} onChange={(e) => setForm((p) => ({ ...p, activa: e.target.value }))} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"><option value="true">Activa</option><option value="false">Inactiva</option></select></label>
              <label className="text-xs">Usuario dueño (obligatorio)<select value={form.owner_user_id} onChange={(e) => setForm((p) => ({ ...p, owner_user_id: e.target.value }))} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"><option value="">Seleccionar...</option>{usuarios.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}</select></label>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setModal(false)} className="rounded border border-slate-300 px-3 py-2 text-sm">Cancelar</button>
              <button onClick={save} className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

