import { cn } from "@/lib/cn";

type StatTone = "default" | "blue" | "green" | "amber" | "red";

const VALUE_TONE: Record<StatTone, string> = {
  default: "text-slate-900",
  blue: "text-blue-600",
  green: "text-emerald-600",
  amber: "text-amber-600",
  red: "text-red-600",
};

interface AppStatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  tone?: StatTone;
  className?: string;
}

export function AppStatCard({
  label,
  value,
  icon,
  hint,
  tone = "default",
  className,
}: AppStatCardProps) {
  return (
    <div
      className={cn(
        "app-surface rounded-[22px] p-5 transition-[box-shadow,transform] duration-150 hover:-translate-y-px hover:shadow-[var(--ims-shadow-card)]",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100/80 text-slate-400">
            {icon}
          </span>
        )}
      </div>
      <p className={cn("text-2xl font-bold tracking-tight mt-2", VALUE_TONE[tone])}>
        {value}
      </p>
      {hint && <p className="text-xs text-slate-500 mt-1.5">{hint}</p>}
    </div>
  );
}
