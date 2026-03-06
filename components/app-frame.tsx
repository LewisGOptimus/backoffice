"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState } from "@/lib/client/app-state";

function Dot({ state }: { state: "checking" | "ok" | "down" }) {
  const color = state === "ok" ? "bg-emerald-500" : state === "down" ? "bg-rose-500" : "bg-amber-400";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}

const MENU_SECTIONS = [
  {
    title: "Administracion",
    items: [
      { href: "/usuarios", label: "Usuarios" },
      { href: "/empresas", label: "Empresas" },
    ],
  },
  {
    title: "Catalogo",
    items: [
      { href: "/productos", label: "Productos" },
      { href: "/planes", label: "Planes" },
      { href: "/entitlements", label: "Entitlements" },
    ],
  },
  {
    title: "Operacion",
    items: [
      { href: "/operaciones", label: "Operaciones" },
      { href: "/suscripciones", label: "Suscripciones" },
      { href: "/facturas", label: "Facturas" },
    ],
  },
];

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { health } = useAppState();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-[1400px] gap-4 p-4">
        <aside className="sticky top-4 h-[calc(100vh-2rem)] w-64 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">BackOffice</h1>
          <p className="mt-1 text-xs text-slate-500">Gestion administrativa</p>
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><Dot state={health.api} /> API</span>
            <span className="inline-flex items-center gap-1"><Dot state={health.db} /> DB</span>
          </div>

          <nav className="mt-4 space-y-1">
            <Link
              href="/backoffice"
              className={`block rounded-lg border px-3 py-2 text-sm ${
                pathname === "/backoffice" || pathname.startsWith("/backoffice/")
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              BackOffice
            </Link>

            {MENU_SECTIONS.map((section) => (
              <div key={section.title} className="pt-2">
                <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{section.title}</p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block rounded-lg border px-3 py-2 text-sm ${
                          active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

