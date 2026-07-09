import { cn } from "@/lib/cn";

export type AppButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost"
  | "subtle";
export type AppButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<AppButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-[#3f8f00] to-[#1f7a00] text-white border border-[#1f7a00]/20 shadow-sm shadow-[#3f8f00]/20 hover:from-[#1f7a00] hover:to-[#186800] hover:shadow-md hover:shadow-[#3f8f00]/25 focus:ring-[#3f8f00]/40",
  secondary:
    "bg-white/90 text-[#101828] border border-[#dfe8d8] shadow-sm hover:bg-[#eef8e8] hover:border-[#3f8f00] focus:ring-[#3f8f00]/30",
  danger:
    "bg-white/90 text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 focus:ring-red-300/40",
  ghost:
    "text-[#1f7a00] hover:bg-[#eef8e8] hover:text-[#186800] focus:ring-[#3f8f00]/30",
  subtle:
    "bg-[#eef8e8] text-[#1f7a00] border border-[#dfe8d8] hover:bg-[#e3f3d9] focus:ring-[#3f8f00]/30",
};

const SIZES: Record<AppButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-11 px-5 text-sm gap-2 rounded-xl",
};

interface AppButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export function AppButton({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  children,
  className,
  disabled,
  ...props
}: AppButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        leadingIcon
      )}
      {children}
      {!loading && trailingIcon}
    </button>
  );
}
