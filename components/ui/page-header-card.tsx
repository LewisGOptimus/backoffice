import type React from "react";

type PageHeaderCardProps = {
  title: string;
  description?: string;
  /** Contenido opcional adicional (botones, filtros, etc.) */
  children?: React.ReactNode;
};

export function PageHeaderCard({ title, description, children }: PageHeaderCardProps) {
  return (
    <>
    <section className="rounded-[16px]  grid grid-cols-2 border border-[#E2E8F0] w-full bg-white p-5  shadow-(--shadow-soft)">
      <div className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold text-[var(--color-primary)]">{title}</h2>
      {description && <p className="text-sm text-slate-600">{description}</p>}
      </div>
      
      <div>
      {children && <div className="mt-3 flex justify-end">{children}</div>}
      </div>
    </section>
    </>
  );
}

