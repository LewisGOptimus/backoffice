"use client";

import { useEffect, useState } from "react";
import { fetchJson, isSuccess } from "@/lib/client/api";
import toast from "react-hot-toast";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeaderCard } from "@/components/ui/page-header-card";

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
    <main className="main-stack">
      <PageHeaderCard
        title="Entitlements por empresa"
        description="Consulta los entitlements vigentes por empresa."
      >
        <label className="mt-2 block text-xs text-slate-700">
          Empresa
          <select
            value={empresaId}
            onChange={(e) => {
              const next = e.target.value;
              setEmpresaId(next);
              if (!next) {
                setRows([]);
                setMessage("Selecciona una empresa.");
              }
            }}
            className="mt-1 ui-input max-w-xl"
          >
            <option value="">Seleccionar...</option>
            {empresas.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
      </PageHeaderCard>

      <section className="main-card">
        <DataTable<EntRow>
          className="max-h-[620px] overflow-auto rounded border border-slate-200"
          rows={rows}
          getRowKey={(r, idx) => `${r.fuente}-${r.codigo}-${idx}`}
          emptyMessage="Sin entitlements vigentes."
          columns={[
            {
              key: "__index",
              header: "#",
              cellClassName: "w-[40px]",
              render: (_r, idx) => idx + 1,
            },
            {
              key: "fuente",
              header: "Fuente",
              render: (r) => (
                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                  {r.fuente}
                </span>
              ),
            },
            { key: "codigo", header: "Codigo" },
            { key: "nombre", header: "Nombre" },
            {
              key: "tipo",
              header: "Tipo",
              render: (r) => (
                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                  {r.tipo}
                </span>
              ),
            },
            {
              key: "valor",
              header: "Valor",
              render: (r) =>
                r.valor_entero ?? String(r.valor_booleano ?? "-"),
            },
          ] as DataTableColumn<EntRow>[]}
        />
      </section>
      <p className="text-xs text-slate-600">{message}</p>
    </main>
  );
}

