"use client";

import { useEffect, useState } from "react";
import { fetchJson, isSuccess } from "@/lib/client/api";
import toast from "react-hot-toast";

type EntRow = { fuente: string; codigo: string; nombre: string; tipo: string; valor_entero: number | null; valor_booleano: boolean | null };

type Lookup = { empresas: Array<{ value: string; label: string }> };

export default function EntitlementsPage() {
  const [empresas, setEmpresas] = useState<Array<{ value: string; label: string }>>([]);
  const [empresaId, setEmpresaId] = useState("");
  const [rows, setRows] = useState<EntRow[]>([]);
  const [message, setMessage] = useState("Selecciona una empresa.");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetchJson<Lookup>("/api/backoffice/lookups");
        if (isSuccess(res)) setEmpresas(res.data.empresas);
      } catch {
        toast.error("Error de red al cargar empresas.");
      }
    })();
  }, []);

  useEffect(() => {
    if (!empresaId) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetchJson<EntRow[]>(`/api/backoffice/empresas/${empresaId}/entitlements`);
        if (isSuccess(res)) {
          setRows(res.data);
          setMessage(res.data.length ? "Entitlements vigentes cargados." : "La empresa no tiene entitlements vigentes.");
        } else {
          setMessage(res.error.message);
          toast.error(res.error.message);
        }
      } catch {
        toast.error("Error de red al cargar entitlements.");
      }
    }, 0);
    return () => clearTimeout(t);
  }, [empresaId]);

  return (
    <main className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Entitlements por empresa</h2>
        <label className="mt-2 block text-xs text-slate-700">Empresa
          <select value={empresaId} onChange={(e) => { const next = e.target.value; setEmpresaId(next); if (!next) { setRows([]); setMessage("Selecciona una empresa."); } }} className="mt-1 w-full max-w-xl rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">Seleccionar...</option>
            {empresas.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </label>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="max-h-[620px] overflow-auto rounded border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50"><tr><th className="px-2 py-2 text-left">#</th><th className="px-2 py-2 text-left">Fuente</th><th className="px-2 py-2 text-left">Codigo</th><th className="px-2 py-2 text-left">Nombre</th><th className="px-2 py-2 text-left">Tipo</th><th className="px-2 py-2 text-left">Valor</th></tr></thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={`${r.fuente}-${r.codigo}-${idx}`} className="border-t border-slate-100">
                  <td className="px-2 py-2">{idx + 1}</td>
                  <td className="px-2 py-2"><span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 font-semibold">{r.fuente}</span></td>
                  <td className="px-2 py-2">{r.codigo}</td>
                  <td className="px-2 py-2">{r.nombre}</td>
                  <td className="px-2 py-2"><span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 font-semibold">{r.tipo}</span></td>
                  <td className="px-2 py-2">{r.valor_entero ?? String(r.valor_booleano ?? "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-xs text-slate-600">{message}</p>
    </main>
  );
}

