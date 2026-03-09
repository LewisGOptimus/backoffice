"use client";

import { useState } from "react";
import { fetchJson, isSuccess } from "@/lib/client/api";
import toast from "react-hot-toast";
import { PageHeaderCard } from "@/components/ui/page-header-card";

type StatusProps = { loading: boolean; message: string };

function BackofficeLoader({ loading, message }: StatusProps) {
  if (!loading && message === "Listo") return null;
  return (
    <p className="mt-2 text-sm text-slate-700">
      {loading ? "Procesando..." : message}
    </p>
  );
}

export default function BackOfficePage() {
  const [key, setKey] = useState("");
  const [message, setMessage] = useState("Listo");
  const [loading, setLoading] = useState(false);

  const runSeed = async () => {
    try {
      setLoading(true);
      const res = await fetchJson<{ seeded: boolean }>("/api/backoffice/seed", {
        method: "POST",
        headers: { "x-backoffice-key": key },
      });
      setLoading(false);
      if (isSuccess(res)) {
        setMessage("Semilla cargada correctamente.");
        toast.success("Semilla cargada correctamente.");
        return;
      }
      setMessage(res.error.message);
      toast.error(res.error.message);
    } catch {
      setLoading(false);
      toast.error("Error de red al cargar semilla.");
    }
  };

  const runClean = async () => {
    if (!confirm("Esto limpiara completamente common/core/billing. Deseas continuar?")) return;
    try {
      setLoading(true);
      const res = await fetchJson<{ cleaned: boolean }>("/api/backoffice/clean", {
        method: "POST",
        headers: { "x-backoffice-key": key },
      });
      setLoading(false);
      if (isSuccess(res)) {
        setMessage("Base limpiada correctamente.");
        toast.success("Base limpiada correctamente.");
        return;
      }
      setMessage(res.error.message);
      toast.error(res.error.message);
    } catch {
      setLoading(false);
      toast.error("Error de red al limpiar base.");
    }
  };

  return (
    <main className="space-y-4">
      <PageHeaderCard
        title="BackOffice"
        description="Acciones administrativas del entorno."
      />

      <section className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-(--shadow-soft)">
        <div className="flex flex-col gap-2">
        <label className="text-xs text-slate-700 pl-2">Clave BackOffice</label>
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="BACKOFFICE_ADMIN_KEY" className="mt-1 w-full max-w-sm rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
 
        <div className="mt-3 flex gap-2">
          <button onClick={runSeed} disabled={loading} className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">Cargar semilla</button>
          <button onClick={runClean} disabled={loading} className="rounded bg-gray-400 px-4 py-2 text-sm font-semibold text-white">Limpiar base</button>
        </div>
        <BackofficeLoader loading={loading} message={message} />
      </section>
    </main>
  );
}

