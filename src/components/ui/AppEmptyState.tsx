import { cn } from "@/lib/cn";

interface AppEmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function AppEmptyState({
  title,
  description,
  icon,
  action,
  className,
}: AppEmptyStateProps) {
  return (
    <div className={cn("text-center py-14 px-6", className)}>
      {icon && (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-400 ring-1 ring-slate-200/60">
          {icon}
        </div>
      )}
      <p className="text-slate-900 font-semibold">{title}</p>
      {description && (
        <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
