"use client";

import { cn } from "@/lib/cn";

export interface AppFilterOption {
  value: string;
  label: string;
}

interface AppFilterProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: AppFilterOption[];
  allLabel?: string;
  showAllOption?: boolean;
  className?: string;
}

export function AppFilter({
  label,
  value,
  onChange,
  options,
  allLabel = "Alle",
  showAllOption = true,
  className,
}: AppFilterProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && (
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{label}</span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="app-input-field w-auto min-w-[8rem] pr-10"
      >
        {showAllOption && <option value="">{allLabel}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface AppFilterTabsProps {
  value: string;
  onChange: (value: string) => void;
  options: AppFilterOption[];
  className?: string;
}

export function AppFilterTabs({
  value,
  onChange,
  options,
  className,
}: AppFilterTabsProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl border border-slate-200/80 bg-slate-50/60 p-1",
        className
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150",
            value === opt.value
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
