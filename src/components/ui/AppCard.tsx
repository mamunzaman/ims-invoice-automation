import { cn } from "@/lib/cn";

interface AppCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function AppCard({ children, className, padding = false }: AppCardProps) {
  return (
    <div
      className={cn(
        "app-surface rounded-2xl overflow-hidden",
        padding && "p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AppCardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100/80">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        {description && (
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function AppCardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-6 py-6", className)}>{children}</div>;
}

export function AppCardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-6 py-4 border-t border-slate-100/80 bg-slate-50/40 flex flex-wrap items-center gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}

interface AppSectionProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AppSection({
  title,
  description,
  action,
  children,
  className,
}: AppSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-slate-500 mt-1">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
