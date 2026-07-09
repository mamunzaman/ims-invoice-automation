import { cn } from "@/lib/cn";
import type { AppButtonVariant, AppButtonSize } from "./AppButton";

const VARIANTS: Record<AppButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-[#3f8f00] to-[#1f7a00] text-white shadow-sm hover:from-[#1f7a00] hover:to-[#186800] focus:ring-[#3f8f00]/40",
  secondary:
    "bg-white/90 text-[#101828] border border-[#dfe8d8] shadow-sm hover:bg-[#eef8e8] hover:border-[#3f8f00] focus:ring-[#3f8f00]/30",
  danger:
    "bg-white/90 text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 focus:ring-red-300/40",
  ghost:
    "text-[#667085] hover:bg-[#eef8e8] hover:text-[#1f7a00] focus:ring-[#3f8f00]/30",
  subtle:
    "bg-[#eef8e8] text-[#1f7a00] border border-[#dfe8d8] hover:bg-[#e3f3d9] focus:ring-[#3f8f00]/30",
};

const SIZES: Record<AppButtonSize, string> = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-9 w-9 rounded-xl",
  lg: "h-11 w-11 rounded-xl",
};

interface AppIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  label: string;
  icon: React.ReactNode;
}

export function AppIconButton({
  variant = "ghost",
  size = "md",
  label,
  icon,
  className,
  ...props
}: AppIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
