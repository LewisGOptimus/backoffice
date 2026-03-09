"use client";

import { useEffect, useId, type ReactNode } from "react";

type AppModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  panelClassName?: string;
  bodyClassName?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
};

function cx(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AppModal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  maxWidthClassName = "max-w-xl",
  panelClassName,
  bodyClassName,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
}: AppModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape) onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeOnEscape, onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-md"
      onClick={() => closeOnBackdrop && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          `w-full ${maxWidthClassName} overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_56px_rgba(15,23,42,0.18)]`,
          panelClassName,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 pb-6 pt-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {icon ? (
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
                  {icon}
                </span>
              ) : null}
              <div>
                <h3 id={titleId} className="text-[22px] leading-none text-slate-900">
                  {title}
                </h3>
                {description ? (
                  <p className="mt-2 text-sm text-slate-500">{description}</p>
                ) : null}
              </div>
            </div>
            {showCloseButton ? (
              <button
                onClick={onClose}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
                aria-label="Cerrar modal"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M5.22 4.16 10 8.94l4.78-4.78 1.06 1.06L11.06 10l4.78 4.78-1.06 1.06L10 11.06l-4.78 4.78-1.06-1.06L8.94 10 4.16 5.22z" />
                </svg>
              </button>
            ) : null}
          </div>

          <div className="mt-4 h-px w-full bg-slate-200" />

          <div className={cx("mt-4 max-h-[52vh] overflow-auto pr-1", bodyClassName)}>
            {children}
          </div>

          {footer ? <div className="mt-5">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
