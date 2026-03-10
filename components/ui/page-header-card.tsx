import type React from "react";

type PageHeaderCardProps = {
  title: string;
  description?: string;
  /** Contenido opcional adicional (botones, filtros, etc.) */
  children?: React.ReactNode;
};

export function PageHeaderCard({ title, description, children }: PageHeaderCardProps) {
  return (
    <section className="rounded-[16px] border border-[#E2E8F0] bg-white p-4 shadow-(--shadow-soft) sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg leading-tight font-semibold text-[var(--color-primary)] sm:text-xl">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </div>
        {children ? <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">{children}</div> : null}
      </div>
    </section>
  );
}

