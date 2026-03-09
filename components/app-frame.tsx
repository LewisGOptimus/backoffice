"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAppState } from "@/lib/client/app-state";

function Dot({ state }: { state: "checking" | "ok" | "down" }) {
  const color = state === "ok" ? "bg-emerald-500" : state === "down" ? "bg-rose-500" : "bg-amber-400";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}

type SidebarItem = { href: string; label: string; icon: string; badge?: number };

const SIDEBAR_SECTIONS: { title: string; items: SidebarItem[] }[] = [
  {
    title: "Admin tools",
    items: [
      { href: "/backoffice", label: "BACKOFFICE", icon: "dashboard" },
    ],
  },
  {
    title: "Administracion",
    items: [
      { href: "/usuarios", label: "Usuarios", icon: "mail" },
      { href: "/empresas", label: "Empresas", icon: "bell" },
    ],
  },
  {
    title: "Catalogo",
    items: [
      { href: "/productos", label: "Productos", icon: "box" },
      { href: "/planes", label: "Planes", icon: "megaphone" },
      { href: "/entitlements", label: "Entitlements", icon: "chat" },
    ],
  },
  {
    title: "Operacion",
    items: [
      { href: "/operaciones", label: "Operaciones", icon: "gear" },
      { href: "/suscripciones", label: "Suscripciones", icon: "calendar" },
      { href: "/facturas", label: "Facturas", icon: "wallet" },
      { href: "/prorrateos", label: "Prorrateos", icon: "file" },
    ],
  },
];

function NavIcon({ icon }: { icon: string }) {
  const cls = "h-4 w-4 shrink-0";
  switch (icon) {
    case "dashboard":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
    case "box":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case "megaphone":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case "wallet":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case "file":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "gear":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 2.31.826 1.37 1.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 2.31-1.37 1.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-2.31-.826-1.37-1.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-2.31 1.37-1.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "mail":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "bell":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
    case "chat":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    default:
      return null;
  }
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { health } = useAppState();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      {/* Header topbar - 70px, white */}
      <header className="sticky top-0 z-40 flex h-[70px] items-center justify-between border-b border-[#E2E8F0] bg-white px-4 md:px-6 shadow-(--shadow-soft)">
        <div className="flex items-center gap-3 md:gap-4">
          {/* Botón menú mobile */}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#1E293B] hover:bg-[#F1F5F9] md:hidden"
            onClick={() => setIsMobileSidebarOpen((open) => !open)}
            aria-label="Abrir menú"
          >
            <span className="sr-only">Toggle sidebar</span>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </button>
          <Link href="/backoffice" className="flex items-center gap-3">
            <Image
              src="/nubeLogo.png"
              alt="Zoe Nube"
              width={100}
              height={40}
              className="h-10 w-auto"
              priority
            />
            <span className="text-lg font-bold tracking-tight text-[#007bff]">BACKOFFICE</span>
          </Link>

        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB]/10">
              <span className="text-xs font-semibold text-[#2563EB]">U</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Welcome</p>
              <p className="text-sm font-medium text-[#1E293B]">Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <Dot state={health.api} /> API
            <Dot state={health.db} /> DB
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row">
        {/* Sidebar mobile como drawer */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <aside
              className="absolute left-0 top-[70px] h-[calc(100vh-70px)] w-64 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="flex flex-col gap-1 p-4">
                {SIDEBAR_SECTIONS.map((section) => (
                  <div key={section.title} className="pt-4 first:pt-0">
                    <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      {section.title}
                    </p>
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors ${
                              active
                                ? "bg-[#007bff] text-white"
                                : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
                            }`}
                            onClick={() => setIsMobileSidebarOpen(false)}
                          >
                            <NavIcon icon={item.icon} />
                            <span className="flex-1">{item.label}</span>
                            {item.badge != null && item.badge > 0 && (
                              <span className="rounded-full bg-[#2563EB] px-2 py-0.5 text-[10px] font-semibold text-white">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Sidebar desktop fija a la izquierda */}
        <aside className="hidden md:block md:fixed md:left-0 md:top-[70px] md:z-30 md:h-[calc(100vh-70px)] md:w-60 md:shrink-0 md:border-r md:border-[#E2E8F0] md:bg-white">
          <nav className="flex flex-col gap-1 p-4">
            {SIDEBAR_SECTIONS.map((section) => (
              <div key={section.title} className="pt-4 first:pt-0">
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors ${
                          active
                            ? "bg-[#007bff] text-white"
                            : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
                        }`}
                      >
                        <NavIcon icon={item.icon} />
                        <span className="flex-1">{item.label}</span>
                        {item.badge != null && item.badge > 0 && (
                          <span className="rounded-full bg-[#2563EB] px-2 py-0.5 text-[10px] font-semibold text-white">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content - container with padding, rounded, shadow */}
        <main className="min-w-0 flex-1  pt-4 md:pl-60 md:pt-6">
          <div className="mx-auto w-full  px-4 pb-8 md:px-6">
            <div className="rounded-[20px] bg-white p-6 shadow-(--shadow-soft)">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
