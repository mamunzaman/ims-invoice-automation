"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

type ModalSize = "sm" | "md" | "lg";

const SIZES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

interface AppModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AppModal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
}: AppModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full app-surface rounded-2xl shadow-2xl shadow-slate-900/10",
          SIZES[size]
        )}
      >
        {(title || description) && (
          <div className="px-6 py-5 border-b border-slate-100/80">
            {title && (
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-slate-500 mt-1">{description}</p>
            )}
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100/80 flex justify-end gap-3 bg-slate-50/40 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
