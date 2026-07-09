import Link from "next/link";
import { cn } from "@/lib/cn";

interface AppPageProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "md" | "lg" | "xl" | "full";
}

const MAX_WIDTH: Record<NonNullable<AppPageProps["maxWidth"]>, string> = {
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  full: "max-w-none",
};

export function AppPage({
  children,
  className,
  maxWidth = "xl",
}: AppPageProps) {
  return (
    <div className={cn("w-full mx-auto space-y-8", MAX_WIDTH[maxWidth], className)}>
      {children}
    </div>
  );
}

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <div className="space-y-2 pt-1">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="flex items-center gap-2">
              {i > 0 && <span className="text-slate-300">/</span>}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:text-slate-700 transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-slate-600">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{subtitle}</p>
          )}
        </div>
        {actions && <PageActions>{actions}</PageActions>}
      </div>
    </div>
  );
}

export function PageActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">{children}</div>
  );
}
