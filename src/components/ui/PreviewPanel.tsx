"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

interface PreviewPanelProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
  collapsible?: boolean;
}

export function PreviewPanel({
  title = "Vorschau",
  description,
  children,
  className,
  sticky = true,
  collapsible = true,
}: PreviewPanelProps) {
  const [open, setOpen] = useState(true);

  return (
    <aside
      className={cn(
        "app-surface rounded-2xl p-5 sm:p-6 space-y-4",
        sticky && "lg:sticky lg:top-8",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description && (
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
          )}
        </div>
        {collapsible && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100/80 transition-colors lg:hidden"
            aria-expanded={open}
          >
            {open ? "Ausblenden" : "Anzeigen"}
          </button>
        )}
      </div>
      {open && children}
    </aside>
  );
}

interface PreviewLayoutProps {
  children: React.ReactNode;
  panel: React.ReactNode;
  className?: string;
}

export function PreviewLayout({ children, panel, className }: PreviewLayoutProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-6 lg:gap-8 items-start",
        className
      )}
    >
      <div className="min-w-0">{children}</div>
      <div className="min-w-0">{panel}</div>
    </div>
  );
}
