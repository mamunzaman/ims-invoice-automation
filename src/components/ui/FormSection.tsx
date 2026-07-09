import { cn } from "@/lib/cn";

interface FormSectionProps {
  title: string;
  description?: string;
  step?: number;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  step,
  children,
  className,
}: FormSectionProps) {
  return (
    <section
      className={cn(
        "relative rounded-2xl border border-slate-100/80 bg-slate-50/35 p-5 sm:p-6",
        className
      )}
    >
      <div className="flex items-start gap-3 mb-5">
        {step != null && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-[11px] font-bold text-white shadow-sm shadow-blue-500/30">
            {step}
          </span>
        )}
        <div className="min-w-0 pt-0.5">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description && (
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      <div className={cn(step != null && "sm:pl-10")}>{children}</div>
    </section>
  );
}

interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-[13px] font-semibold text-slate-700"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5",
        className
      )}
    >
      {children}
    </div>
  );
}
