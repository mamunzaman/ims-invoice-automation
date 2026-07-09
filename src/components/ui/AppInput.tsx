import { cn } from "@/lib/cn";

const FIELD_BASE = "app-input-field block w-full";

interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leadingIcon?: React.ReactNode;
  required?: boolean;
}

function FieldWrapper({
  label,
  error,
  hint,
  required,
  htmlFor,
  children,
}: {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
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

export function AppInput({
  label,
  error,
  hint,
  leadingIcon,
  required,
  className,
  id,
  ...props
}: AppInputProps) {
  const inputId = id || props.name;
  return (
    <FieldWrapper
      label={label}
      error={error}
      hint={hint}
      required={required}
      htmlFor={inputId}
    >
      <div className="relative">
        {leadingIcon && (
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            FIELD_BASE,
            Boolean(leadingIcon) && "pl-10",
            error && "app-input-error",
            className
          )}
          {...props}
        />
      </div>
    </FieldWrapper>
  );
}

interface AppTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export function AppTextarea({
  label,
  error,
  hint,
  required,
  className,
  id,
  rows = 4,
  ...props
}: AppTextareaProps) {
  const inputId = id || props.name;
  return (
    <FieldWrapper
      label={label}
      error={error}
      hint={hint}
      required={required}
      htmlFor={inputId}
    >
      <textarea
        id={inputId}
        rows={rows}
        className={cn(
          "block w-full rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:outline-none focus:border-blue-400 focus:ring-[3px] focus:ring-blue-500/15 focus:bg-white",
          error && "app-input-error",
          className
        )}
        {...props}
      />
    </FieldWrapper>
  );
}

interface AppSelectOption {
  value: string;
  label: string;
}

interface AppSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  options: AppSelectOption[];
  placeholder?: string;
}

export function AppSelect({
  label,
  error,
  hint,
  required,
  options,
  placeholder,
  className,
  id,
  ...props
}: AppSelectProps) {
  const inputId = id || props.name;
  return (
    <FieldWrapper
      label={label}
      error={error}
      hint={hint}
      required={required}
      htmlFor={inputId}
    >
      <select
        id={inputId}
        className={cn(
          FIELD_BASE,
          "appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%2394a3b8%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.17l3.71-3.94a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.625rem_center] bg-no-repeat pr-10",
          error && "app-input-error",
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
